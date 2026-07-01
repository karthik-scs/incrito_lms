import { prisma } from "./prisma";
import { redis, REDIS_KEYS } from "./redis";
import { AppError } from "../utils/AppError";
import type { ZoomAccount } from "../../../app/generated/prisma/client";

/**
 * Multi-account Server-to-Server OAuth Zoom integration. Credentials live in the `ZoomAccount`
 * table (managed from Admin Settings → "Live Class API"), not env vars — multiple rows exist
 * specifically so `pickZoomAccount` can rotate to a less-busy account once one hits its paid
 * plan's concurrent-meeting limit, instead of letting the Zoom API call fail outright.
 *
 * If zero active `ZoomAccount` rows exist, `createMeeting` falls back to a deterministic mock
 * meeting — same honest-stub behavior as before, just keyed off the database instead of env vars.
 */

export function redisKeyForAccount(accountId: string) {
  return `${REDIS_KEYS.zoomAccessToken()}:${accountId}`;
}

type ZoomCredentials = { id: string; label: string; zoomAccountId: string; clientId: string; clientSecret: string };

async function getAccessTokenForCredentials(account: ZoomCredentials): Promise<string> {
  const cacheKey = redisKeyForAccount(account.id);
  const cached = await redis.get(cacheKey).catch(() => null);
  if (cached) return cached;

  const basicAuth = Buffer.from(`${account.clientId}:${account.clientSecret}`).toString("base64");
  const response = await fetch(
    `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${account.zoomAccountId}`,
    { method: "POST", headers: { Authorization: `Basic ${basicAuth}` } }
  );

  if (!response.ok) {
    throw new AppError(`Zoom OAuth token request failed for account "${account.label}": ${response.status}`, 502);
  }

  const body = (await response.json()) as { access_token: string; expires_in: number };
  await redis.set(cacheKey, body.access_token, "EX", body.expires_in - 60).catch(() => null);
  return body.access_token;
}


/**
 * Active meetings on this account that overlap the requested window — both still-`SCHEDULED`
 * (haven't started yet) and currently `LIVE` count against the concurrent-meeting limit.
 */
async function overlappingMeetingCount(accountId: string, startTime: Date, endTime: Date) {
  return prisma.liveClass.count({
    where: {
      zoomAccountId: accountId,
      status: { in: ["SCHEDULED", "LIVE"] },
      startTime: { lt: endTime },
      endTime: { gt: startTime },
    },
  });
}

/** Rotates to the first active account with spare concurrent-meeting capacity for this time window. */
export async function pickZoomAccount(startTime: Date, endTime: Date): Promise<ZoomAccount | null> {
  const accounts = await prisma.zoomAccount.findMany({ where: { isActive: true }, orderBy: { createdAt: "asc" } });
  if (accounts.length === 0) return null;

  for (const account of accounts) {
    const count = await overlappingMeetingCount(account.id, startTime, endTime);
    if (count < account.concurrentLimit) return account;
  }

  throw new AppError(
    `All ${accounts.length} Zoom account(s) are at their concurrent-meeting limit for this time slot. Add another account in Settings → Live Class API, or pick a different time.`,
    409
  );
}

export type ZoomMeeting = {
  zoomMeetingId: string;
  joinUrl: string;
  hostStartUrl: string;
  passcode: string | null;
  zoomAccountId: string | null;
};

/** Shared by the pooled-account path (`createMeeting`) and a host's own personal account (`createMeetingWithCredentials`). */
async function callCreateMeeting(
  account: ZoomCredentials,
  input: { topic: string; startTime: Date; endTime: Date }
): Promise<Omit<ZoomMeeting, "zoomAccountId">> {
  const accessToken = await getAccessTokenForCredentials(account);
  const durationMinutes = Math.max(1, Math.round((input.endTime.getTime() - input.startTime.getTime()) / 60000));

  const response = await fetch(`https://api.zoom.us/v2/users/me/meetings`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      topic: input.topic,
      type: 2,
      start_time: input.startTime.toISOString(),
      duration: durationMinutes,
      settings: { join_before_host: false, waiting_room: false, auto_recording: "cloud" },
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new AppError(`Zoom rejected the meeting request on account "${account.label}": ${detail || response.status}`, 502);
  }

  const body = (await response.json()) as { id: number; join_url: string; start_url: string; password?: string };
  return {
    zoomMeetingId: String(body.id),
    joinUrl: body.join_url,
    hostStartUrl: body.start_url,
    passcode: body.password ?? null,
  };
}

export async function createMeeting(input: { topic: string; startTime: Date; endTime: Date }): Promise<ZoomMeeting> {
  const account = await pickZoomAccount(input.startTime, input.endTime);

  if (!account) {
    const mockId = Math.floor(1000000000 + Math.random() * 8999999999).toString();
    return {
      zoomMeetingId: mockId,
      joinUrl: `https://zoom.us/j/${mockId}?pwd=mock`,
      hostStartUrl: `https://zoom.us/s/${mockId}?pwd=mock&role=1`,
      passcode: "000000",
      zoomAccountId: null,
    };
  }

  const meeting = await callCreateMeeting(account, input);
  return { ...meeting, zoomAccountId: account.id };
}

/**
 * A host's own personally-connected Zoom account (not the shared admin-managed pool) — no
 * concurrency rotation needed, since it's their own license and they can't double-book
 * themselves; Zoom itself will simply reject a second concurrent meeting if they try.
 */
export async function createMeetingWithCredentials(
  account: ZoomCredentials,
  input: { topic: string; startTime: Date; endTime: Date }
): Promise<Omit<ZoomMeeting, "zoomAccountId">> {
  return callCreateMeeting(account, input);
}

/** Used by the webhook handler to fetch a recording file with the right account's access token. */
export async function getAccessTokenForAccount(accountId: string): Promise<string> {
  const account = await prisma.zoomAccount.findUnique({ where: { id: accountId } });
  if (!account) {
    throw new AppError("Zoom account not found", 404);
  }
  return getAccessTokenForCredentials(account);
}
