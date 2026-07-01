import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { MulterError } from "multer";
import { AppError } from "../utils/AppError";
import { failure } from "../utils/apiResponse";
import { logger } from "../lib/logger";

const MULTER_ERROR_MESSAGES: Partial<Record<MulterError["code"], string>> = {
  LIMIT_FILE_SIZE: "That file is too large.",
  LIMIT_UNEXPECTED_FILE: "Unexpected file field.",
};

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return failure(res, "Validation failed", 422, err.issues);
  }

  if (err instanceof MulterError) {
    return failure(res, MULTER_ERROR_MESSAGES[err.code] ?? `Upload failed: ${err.message}`, 422);
  }

  if (err instanceof AppError) {
    if (err.status >= 500) {
      logger.error(err.message, { path: req.path, details: err.details });
    }
    return failure(res, err.message, err.status, err.details);
  }

  const message = err instanceof Error ? err.message : "Unexpected error";
  logger.error(message, { path: req.path });
  return failure(res, "Internal server error", 500);
}
