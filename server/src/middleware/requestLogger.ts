import type { NextFunction, Request, Response } from "express";
import { logger } from "../lib/logger";

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const startedAt = Date.now();

  res.on("finish", () => {
    logger.info(`${req.method} ${req.originalUrl} -> ${res.statusCode}`, {
      durationMs: Date.now() - startedAt,
    });
  });

  next();
}
