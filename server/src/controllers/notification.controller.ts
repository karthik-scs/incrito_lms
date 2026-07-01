import type { Request, Response } from "express";
import { success } from "../utils/apiResponse";
import * as notificationService from "../services/notification.service";

export async function list(req: Request, res: Response) {
  const notifications = await notificationService.listMine(req.user!.id);
  const unreadCount = await notificationService.countUnread(req.user!.id);
  return success(res, { notifications, unreadCount });
}

export async function markRead(req: Request, res: Response) {
  const notification = await notificationService.markRead(String(req.params.id), req.user!.id);
  return success(res, notification);
}

export async function markAllRead(req: Request, res: Response) {
  await notificationService.markAllRead(req.user!.id);
  return success(res, { marked: true });
}

export async function remove(req: Request, res: Response) {
  await notificationService.dismiss(String(req.params.id), req.user!.id);
  return success(res, { deleted: true });
}
