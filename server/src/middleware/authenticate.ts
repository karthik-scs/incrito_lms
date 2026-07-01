import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError";
import { verifyAccessToken } from "../services/token.service";
import { redis, REDIS_KEYS } from "../lib/redis";

export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw new AppError("Authentication required", 401);
  }

  const token = header.slice("Bearer ".length);

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
