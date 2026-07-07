import { prisma } from "./prisma";
import { redis, REDIS_KEYS } from "./redis";
import { env } from "../config/env";
import { AppError } from "../utils/AppError";
import type { UserLiveAccount } from "../../../app/generated/prisma/client";

/**
 * Per-user Zoho Meeting OAuth integration — each Mentor/Cohort Manager/Admin connects their own
 * personal Zoho Workplace account via the standard OAuth authorization-code flow (one org-level
 * self-client registered once via ZOHO_CLIENT_ID/ZOHO_CLIENT_SECRET; each user does their own
 * one-time consent). Only the resulting refresh token is stored on `UserLiveAccount` — access
 * tokens are always re-derived and cached in Redis.
 *
 * Verified live end-to-end against a real connected account (not just docs) — every detail below
 * was confirmed by actually scheduling a real meeting, not assumed from Zoho's own thin/outdated
 * public docs:
 * - The org is on Zoho's **India datacenter** for this deployment — `ZOHO_ACCOUNTS_DOMAIN`/
 *   `ZOHO_API_DOMAIN` must be the `.in` ones, confirmed by testing every regional domain directly
 *   against the token endpoint (`.com` returns `invalid_client` for this app; `.in` doesn't).
 * - `GET /api/v2/user.json` (needs the `ZohoMeeting.manageOrg.READ` scope specifically — the
 *   meeting.CREATE/READ/UPDATE scopes alone return `INVALID_OAUTHSCOPE` for this endpoint) returns
 *   `userDetails.zsoid` (org ID, required as a path segment on every other endpoint) and
 *   `userDetails.zuid` (this user's own ID, required as the `presenter` field — omitting it fails
 *   with `INVALID_PRESENTER_ID`). Both are fetched once and cached on `UserLiveAccount`.
 * - Create-meeting is `POST /api/v2/{zsoid}/sessions.json` (not `/api/v2/sessions`), body wrapped
 *   in `{ session: {...} }`, `startTime` as a literal formatted string (`"Jun 19, 2026 07:00 PM"`,
 *   not epoch millis), `duration` in milliseconds, and `timezone` is required (`MISSING_PARAM_TIMEZONE`
 *   otherwise). Response is `{ session: { meetingKey, joinLink, startLink, ... } }`.
 */

const ZOHO_SCOPES = "ZohoMeeting.meeting.CREATE,ZohoMeeting.meeting.READ,ZohoMeeting.meeting.UPDATE,ZohoMeeting.manageOrg.READ";

/** Reads org-level Zoho config from DB first (Admin → Settings → Zoho), falls back to env vars. */
async function getZohoConfig() {
  const { getActiveZohoConfig } = await import("../services/zoho-setting.service");
  const dbConfig = await getActiveZohoConfig().catch(() => null);
  const clientId = dbConfig?.clientId ?? env.ZOHO_CLIENT_ID;
  const clientSecret = dbConfig?.clientSecret ?? env.ZOHO_CLIENT_SECRET;
  const accountsDomain = dbConfig?.accountsDomain ?? env.ZOHO_ACCOUNTS_DOMAIN;
  const apiDomain = dbConfig?.apiDomain ?? env.ZOHO_API_DOMAIN;
  return { clientId, clientSecret, accountsDomain, apiDomain };
}

export async function getZohoAuthorizeUrl(state: string) {
  const { clientId, accountsDomain } = await getZohoConfig();
  if (!clientId) {
    throw new AppError("Zoho is not configured — add your credentials in Admin → Settings → Zoho Settings.", 500);
  }
  const params = new URLSearchParams({
    scope: ZOHO_SCOPES,
    client_id: clientId,
    response_type: "code",
    access_type: "offline",
    redirect_uri: env.zohoRedirectUri,
    prompt: "consent",
    state,
  });
  return `${accountsDomain}/oauth/v2/auth?${params.toString()}`;
}

export async function exchangeZohoCodeForRefreshToken(code: string): Promise<{ refreshToken: string; accountOwnerName: string | null }> {
  const { clientId, clientSecret, accountsDomain } = await getZohoConfig();
  if (!clientId || !clientSecret) {
    throw new AppError("Zoho is not configured — add your credentials in Admin → Settings → Zoho Settings.", 500);
  }
  const params = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: env.zohoRedirectUri,
    code,
  });
  const response = await fetch(`${accountsDomain}/oauth/v2/token`, { method: "POST", body: params });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new AppError(`Zoho rejected the authorization code: ${detail || response.status}`, 502);
  }
  const body = (await response.json()) as { refresh_token?: string; error?: string };
  if (!body.refresh_token) {
    throw new AppError(`Zoho did not return a refresh token (${body.error ?? "unknown error"}) — try connecting again.`, 502);
  }
  return { refreshToken: body.refresh_token, accountOwnerName: null };
}

async function getAccessToken(account: UserLiveAccount): Promise<string> {
  if (!account.zohoRefreshToken) {
    throw new AppError("This Zoho account isn't fully connected — reconnect it in Settings.", 422);
  }
  const cacheKey = REDIS_KEYS.zohoAccessToken(account.id);
  const cached = await redis.get(cacheKey).catch(() => null);
  if (cached) return cached;

  const { clientId, clientSecret, accountsDomain } = await getZohoConfig();
  if (!clientId || !clientSecret) {
    throw new AppError("Zoho is not configured — add your credentials in Admin → Settings → Zoho Settings.", 500);
  }
  const params = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: account.zohoRefreshToken,
  });
  const response = await fetch(`${accountsDomain}/oauth/v2/token`, { method: "POST", body: params });
  if (!response.ok) {
    throw new AppError("Zoho access token refresh failed — the connected account may need to be reconnected.", 502);
  }
  const body = (await response.json()) as { access_token: string; expires_in: number };
  await redis.set(cacheKey, body.access_token, "EX", body.expires_in - 60).catch(() => null);
  return body.access_token;
}

/** Fetches and caches `zsoid`/`zuid` on first use — every later call reuses the stored values, no repeat API call. */
async function getOrgIds(account: UserLiveAccount, accessToken: string): Promise<{ zsoid: string; zuid: string }> {
  if (account.zohoZsoid && account.zohoZuid) {
    return { zsoid: account.zohoZsoid, zuid: account.zohoZuid };
  }

  const { apiDomain } = await getZohoConfig();
  const response = await fetch(`${apiDomain}/api/v2/user.json`, {
    headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
  });
  if (!response.ok) {
    throw new AppError("Couldn't read your Zoho organization details — reconnect your Zoho account in Settings.", 502);
  }
  // Zoho returns zsoid/zuid as JSON numbers, not strings — coerce to string for storage.
  const body = (await response.json()) as { userDetails?: { zsoid?: string | number; zuid?: string | number } };
  const zsoid = body.userDetails?.zsoid != null ? String(body.userDetails.zsoid) : undefined;
  const zuid = body.userDetails?.zuid != null ? String(body.userDetails.zuid) : undefined;
  if (!zsoid || !zuid) {
    throw new AppError("Zoho didn't return organization details for this account.", 502);
  }

  await prisma.userLiveAccount.update({ where: { id: account.id }, data: { zohoZsoid: zsoid, zohoZuid: zuid } });
  return { zsoid, zuid };
}

const ZOHO_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Zoho's required literal format: `"Jun 19, 2026 07:00 PM"` — zero-padded 12-hour clock, no comma after the year. */
function formatZohoTime(date: Date): string {
  const hour24 = date.getHours();
  const hour12 = String(hour24 % 12 || 12).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  const ampm = hour24 >= 12 ? "PM" : "AM";
  return `${ZOHO_MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()} ${hour12}:${minute} ${ampm}`;
}

export type ZohoMeeting = {
  zohoMeetingId: string;
  joinUrl: string;
  hostStartUrl: string;
};

export async function createZohoMeeting(
  userLiveAccountId: string,
  input: { topic: string; startTime: Date; endTime: Date }
): Promise<ZohoMeeting> {
  const account = await prisma.userLiveAccount.findUnique({ where: { id: userLiveAccountId } });
  if (!account || account.provider !== "ZOHO" || !account.isActive) {
    throw new AppError("Zoho account not found or inactive", 404);
  }

  const accessToken = await getAccessToken(account);
  const { zsoid, zuid } = await getOrgIds(account, accessToken);
  const { apiDomain } = await getZohoConfig();
  const durationMs = Math.max(60_000, input.endTime.getTime() - input.startTime.getTime());

  const response = await fetch(`${apiDomain}/api/v2/${zsoid}/sessions.json`, {
    method: "POST",
    headers: { Authorization: `Zoho-oauthtoken ${accessToken}`, "Content-Type": "application/json;charset=UTF-8" },
    body: JSON.stringify({
      session: {
        topic: input.topic,
        presenter: zuid,
        startTime: formatZohoTime(input.startTime),
        duration: durationMs,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new AppError(`Zoho rejected the meeting request: ${detail || response.status}`, 502);
  }

  const body = (await response.json()) as {
    session?: { meetingKey?: string; joinLink?: string; startLink?: string };
    error?: { message?: string };
  };
  const session = body.session;
  if (body.error || !session?.meetingKey || !session?.joinLink) {
    throw new AppError(`Zoho rejected the meeting request: ${body.error?.message ?? "unexpected response shape"}`, 502);
  }

  return {
    zohoMeetingId: session.meetingKey,
    joinUrl: session.joinLink,
    hostStartUrl: session.startLink ?? session.joinLink,
  };
}
