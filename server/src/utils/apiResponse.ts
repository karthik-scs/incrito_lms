import type { Response } from "express";
import type { ApiResponse } from "../types/api";

export function success<T>(res: Response, data: T, status = 200) {
  const body: ApiResponse<T> = { success: true, data };
  return res.status(status).json(body);
}

export function failure(res: Response, message: string, status = 400, details?: unknown) {
  const body: ApiResponse<never> = { success: false, message, details };
  return res.status(status).json(body);
}
