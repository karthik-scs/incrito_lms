import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError";

/**
 * Checks permission keys carried on the access token (req.user.permissions),
 * not role names — admin-defined custom roles (e.g. "Support") work with no
 * special-casing because they're just another set of permission keys.
 */
export function authorize(permissionKey: string) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new AppError("Authentication required", 401);
    }
    if (!req.user.permissions.includes(permissionKey)) {
      throw new AppError("You do not have permission to perform this action", 403);
    }
    next();
  };
}
