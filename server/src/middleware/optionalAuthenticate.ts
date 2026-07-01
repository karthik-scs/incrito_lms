import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../services/token.service";
import { redis, REDIS_KEYS } from "../lib/redis";

/** Like `authenticate` but never throws — attaches `req.user` if a valid token is present, otherwise continues unauthenticated. */
export async function optionalAuthenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return next();

  try {
    const token = header.slice("Bearer ".length);
    const user = verifyAccessToken(token);
    const revoked = await redis.get(REDIS_KEYS.revokedSession(user.sessionId)).catch(() => null);
    if (!revoked) req.user = user;
  } catch {
    // Token invalid or expired — proceed unauthenticated
  }
  next();
}
