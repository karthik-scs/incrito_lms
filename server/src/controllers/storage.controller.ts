import type { Request, Response } from "express";
import { success } from "../utils/apiResponse";
import * as storageService from "../services/storage.service";
import { prisma } from "../lib/prisma";

/** Admin: list all users with storage usage. */
export async function adminList(req: Request, res: Response) {
  const usages = await storageService.getAllUsersStorageUsage();
  const userIds = usages.map((u) => u.userId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));
  const rows = usages.map((u) => ({ ...u, user: userMap.get(u.userId) }));
  return success(res, rows);
}

/** Admin: set storage limit for a user. */
export async function adminSetLimit(req: Request, res: Response) {
  const { limitMb } = req.body;
  await storageService.setUserStorageLimit(String(req.params.userId), Number(limitMb));
  return success(res, { ok: true });
}

/** Admin: list files for a specific user. */
export async function adminUserFiles(req: Request, res: Response) {
  const files = await storageService.getUserFileUploads(String(req.params.userId));
  return success(res, files);
}

/** Admin: delete any file upload. */
export async function adminDeleteFile(req: Request, res: Response) {
  await storageService.deleteFileUpload(String(req.params.id), req.user!.id, true);
  return success(res, { deleted: true });
}

/** User: get own storage usage and file list. */
export async function myUsage(req: Request, res: Response) {
  const [used, limitMb, files] = await Promise.all([
    storageService.getUserStorageUsed(req.user!.id),
    storageService.getUserStorageLimitMb(req.user!.id),
    storageService.getUserFileUploads(req.user!.id),
  ]);
  return success(res, { usedBytes: used, limitMb, files });
}

/** User: delete own file upload. */
export async function myDeleteFile(req: Request, res: Response) {
  await storageService.deleteFileUpload(String(req.params.id), req.user!.id, false);
  return success(res, { deleted: true });
}
