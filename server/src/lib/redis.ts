import Redis from "ioredis";
import { env } from "../config/env";
import { logger } from "./logger";

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 1,
  lazyConnect: true,
  retryStrategy: () => 30_000,
  // Fail fast instead of queueing commands while disconnected — every call site already
  // catches and fails open, but only if the rejection happens quickly.
  enableOfflineQueue: false,
});

let lastErrorLoggedAt = 0;

redis.on("error", (err) => {
  const now = Date.now();
  if (now - lastErrorLoggedAt > 30_000) {
    logger.error("Redis connection error (rate limiting and session revocation will fail open until this is fixed)", {
      message: err.message || err.toString(),
    });
    lastErrorLoggedAt = now;
  }
});

export const REDIS_KEYS = {
  revokedSession: (sessionId: string) => `revoked:session:${sessionId}`,
  authRateLimit: (ip: string) => `ratelimit:auth:${ip}`,
  otpRateLimit: (email: string) => `ratelimit:otp:${email.toLowerCase()}`,
  zoomAccessToken: () => "zoom:access_token",
  zohoAccessToken: (userLiveAccountId: string) => `zoho:access_token:${userLiveAccountId}`,
  // zohoOAuthState removed — the Zoho connect state token is now a signed JWT (no Redis needed).
};
