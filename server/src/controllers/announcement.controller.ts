import type { Request, Response } from "express";
import { AppError } from "../utils/AppError";
import { success } from "../utils/apiResponse";
import * as announcementService from "../services/announcement.service";

const ALLOWED_ROLES = ["Admin", "Mentor", "Cohort Manager"];

export async function list(req: Request, res: Response) {
  const roleName = req.user!.roleName;
  if (!ALLOWED_ROLES.includes(roleName)) throw new AppError("Forbidden", 403);
  const announcements = await announcementService.listAnnouncements(req.user!.id, roleName);
  return success(res, announcements);
}

export async function create(req: Request, res: Response) {
  const roleName = req.user!.roleName;
  if (!ALLOWED_ROLES.includes(roleName)) throw new AppError("Forbidden", 403);
  const announcement = await announcementService.createAnnouncement(req.body, req.user!.id, roleName);
  return success(res, announcement, 201);
}

export async function remove(req: Request, res: Response) {
  const roleName = req.user!.roleName;
  if (!ALLOWED_ROLES.includes(roleName)) throw new AppError("Forbidden", 403);
  await announcementService.deleteAnnouncement(String(req.params.id), req.user!.id, roleName);
  return success(res, { deleted: true });
}
