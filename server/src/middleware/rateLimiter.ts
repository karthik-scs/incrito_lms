import type { NextFunction, Request, Response } from "express";
import { redis } from "../lib/redis";
import { AppError } from "../utils/AppError";

/** Redis-backed fixed-window rate limiter, keyed by an arbitrary key builder. */
export function rateLimiter(options: { keyFor: (req: Request) => string; limit: number; windowSeconds: number }) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const key = options.keyFor(req);
    const count = await redis.incr(key).catch(() => null);

    if (count === null) {
      // Redis unavailable - fail open rather than blocking auth entirely.
      return next();
    }

    if (count === 1) {
      await redis.expire(key, options.windowSeconds);
    }

    if (count > options.limit) {
      throw new AppError("Too many requests, please try again later", 429);
    }

    next();
  };
}
