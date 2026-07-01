import { prisma } from "../lib/prisma";
import { AppError } from "../utils/AppError";
import { getZohoAuthorizeUrl, exchangeZohoCodeForRefreshToken } from "../lib/zoho";
import { env } from "../config/env";
import jwt from "jsonwebtoken";

const ZOHO_STATE_TTL_SECONDS = 10 * 60;

const safeSelect = {
  id: true,
  provider: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  zoomAccountId: true,
  zohoAccountOwnerName: true,
  // Secrets are deliberately excluded — the frontend only ever sees booleans for those, never the values.
} as const;

/** Every live account a user has connected — secrets redacted, same pattern as ZoomAccountsTab/WhatsApp settings. */
export async function listMyLiveAccounts(userId: string) {
  const rows = await prisma.userLiveAccount.findMany({ where: { userId }, select: safeSelect });
  return rows.map((row) => ({
    ...row,
    zoomConfigured: row.provider === "ZOOM",
  }));
}

export async function connectZoomAccount(
  userId: string,
  data: { zoomAccountId: string; zoomClientId: string; zoomClientSecret: string; zoomSecretToken: string }
) {
  const account = await prisma.userLiveAccount.upsert({
    where: { userId_provider: { userId, provider: "ZOOM" } },
    update: { ...data, isActive: true },
    create: { userId, provider: "ZOOM", ...data },
    select: safeSelect,
  });
  return account;
}

export async function disconnectLiveAccount(userId: string, id: string) {
  const account = await prisma.userLiveAccount.findUnique({ where: { id } });
  if (!account || account.userId !== userId) {
    throw new AppError("Live account not found", 404);
  }
  await prisma.userLiveAccount.delete({ where: { id } });
}

/**
 * Starts the Zoho OAuth connect flow — returns the URL the frontend should redirect the browser
 * to. The `state` is a short-lived signed JWT (not stored in Redis) carrying the userId, signed
 * with JWT_ACCESS_SECRET so it can't be forged. This eliminates the Redis dependency for this
 * flow entirely, which also makes it work in environments where Redis isn't running.
 */
export async function startZohoConnect(userId: string) {
  const state = jwt.sign(
    { sub: userId, purpose: "zoho_oauth" },
    env.JWT_ACCESS_SECRET,
    { expiresIn: ZOHO_STATE_TTL_SECONDS }
  );
  return await getZohoAuthorizeUrl(state);
}

/**
 * Handles Zoho's redirect back after consent. Verifies the signed JWT state token (instead of
 * Redis lookup) to recover which user initiated the flow — no server-side storage required.
 */
export async function completeZohoConnect(code: string, state: string): Promise<{ redirectTo: "success" | "error" }> {
  let userId: string;
  try {
    const payload = jwt.verify(state, env.JWT_ACCESS_SECRET) as { sub: string; purpose: string };
    if (payload.purpose !== "zoho_oauth" || !payload.sub) return { redirectTo: "error" };
    userId = payload.sub;
  } catch {
    return { redirectTo: "error" };
  }

  try {
    const { refreshToken, accountOwnerName } = await exchangeZohoCodeForRefreshToken(code);
    await prisma.userLiveAccount.upsert({
      where: { userId_provider: { userId, provider: "ZOHO" } },
      update: { zohoRefreshToken: refreshToken, zohoAccountOwnerName: accountOwnerName, isActive: true },
      create: { userId, provider: "ZOHO", zohoRefreshToken: refreshToken, zohoAccountOwnerName: accountOwnerName },
    });
    return { redirectTo: "success" };
  } catch {
    return { redirectTo: "error" };
  }
}
