import type { Request, Response } from "express";
import { success } from "../utils/apiResponse";
import * as announcementService from "../services/announcement.service";

export async function list(_req: Request, res: Response) {
  const announcements = await announcementService.listAnnouncements();
  return success(res, announcements);
}

export async function create(req: Request, res: Response) {
  const announcement = await announcementService.createAnnouncement(req.body, req.user!.id);
  return success(res, announcement, 201);
}

export async function remove(req: Request, res: Response) {
  await announcementService.deleteAnnouncement(String(req.params.id));
  return success(res, { deleted: true });
}
