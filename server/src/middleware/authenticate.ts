import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError";
import { verifyAccessToken } from "../services/token.service";
import { redis, REDIS_KEYS } from "../lib/redis";

export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  // Primary: Authorization header. Fallback: ?token= query param (used by PDF iframe src).
  const header = req.headers.authorization;
  const queryToken = typeof req.query.token === "string" ? req.query.token : null;

  if (!header?.startsWith("Bearer ") && !queryToken) {
    throw new AppError("Authentication required", 401);
  }

  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : queryToken!;

  let user;
  try {
    user = verifyAccessToken(token);
  } catch {
    throw new AppError("Invalid or expired access token", 401);
  }

  const revoked = await redis.get(REDIS_KEYS.revokedSession(user.sessionId)).catch(() => null);
  if (revoked) {
    throw new AppError("Session has been revoked", 401);
  }

  req.user = user;
  next();
}
