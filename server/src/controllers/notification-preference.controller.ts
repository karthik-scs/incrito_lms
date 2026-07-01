import type { Request, Response } from "express";
import { success } from "../utils/apiResponse";
import * as notificationPreferenceService from "../services/notification-preference.service";

export async function get(req: Request, res: Response) {
  const preferences = await notificationPreferenceService.getPreferences(req.user!.id);
  return success(res, preferences);
}

export async function update(req: Request, res: Response) {
  const preferences = await notificationPreferenceService.updatePreferences(req.user!.id, req.body);
  return success(res, preferences);
}
