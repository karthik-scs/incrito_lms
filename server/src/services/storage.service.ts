import { prisma } from "../lib/prisma";
import { AppError } from "../utils/AppError";
import { deleteObject } from "../lib/s3";

export type StorageContext = "CHAT" | "DISCUSSION" | "COMMUNITY";

/** Track a newly uploaded file for storage quota accounting. */
export async function trackFileUpload(userId: string, s3Key: string, sizeBytes: number, context: StorageContext) {
  await prisma.fileUpload.create({ data: { userId, s3Key, sizeBytes, context } });
}

/** Get total bytes used by a user across tracked uploads. */
export async function getUserStorageUsed(userId: string): Promise<number> {
  const result = await prisma.fileUpload.aggregate({
    where: { userId },
    _sum: { sizeBytes: true },
  });
  return result._sum.sizeBytes ?? 0;
}

/** Get storage limit in MB for a user. Defaults to 500 MB. */
export async function getUserStorageLimitMb(userId: string): Promise<number> {
  const limit = await prisma.userStorageLimit.findUnique({ where: { userId } });
  return limit?.limitMb ?? 500;
}

/** Check if a user has space for an additional upload. Throws 413 if over limit. */
export async function assertStorageAvailable(userId: string, newSizeBytes: number) {
  const [used, limitMb] = await Promise.all([
    getUserStorageUsed(userId),
    getUserStorageLimitMb(userId),
  ]);
  const limitBytes = limitMb * 1024 * 1024;
  if (used + newSizeBytes > limitBytes) {
    const usedMb = (used / (1024 * 1024)).toFixed(1);
    throw new AppError(
      `Storage limit exceeded. You have used ${usedMb} MB of your ${limitMb} MB limit. Delete some files to free space.`,
      413
    );
  }
}

/** Get per-user storage usage summary for admin. */
export async function getAllUsersStorageUsage() {
  const [usages, limits] = await Promise.all([
    prisma.fileUpload.groupBy({
      by: ["userId"],
      _sum: { sizeBytes: true },
      _count: { id: true },
    }),
    prisma.userStorageLimit.findMany(),
  ]);

  const limitsMap = new Map(limits.map((l: { userId: string; limitMb: number }) => [l.userId, l.limitMb]));
  return usages.map((u: { userId: string; _sum: { sizeBytes: number | null }; _count: { id: number } }) => ({
    userId: u.userId,
    usedBytes: u._sum.sizeBytes ?? 0,
    fileCount: u._count.id,
    limitMb: limitsMap.get(u.userId) ?? 500,
  }));
}

/** Get file uploads for a specific user. */
export async function getUserFileUploads(userId: string) {
  return prisma.fileUpload.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

/** Delete a specific file upload (removes from S3 and DB). */
export async function deleteFileUpload(uploadId: string, requestingUserId: string, isAdmin: boolean) {
  const upload = await prisma.fileUpload.findUnique({ where: { id: uploadId } });
  if (!upload) throw new AppError("File not found", 404);
  if (!isAdmin && upload.userId !== requestingUserId) throw new AppError("Not authorized", 403);

  await deleteObject(upload.s3Key).catch(() => null);
  await prisma.fileUpload.delete({ where: { id: uploadId } });
}

/** Set the storage limit for a user (admin only). */
export async function setUserStorageLimit(userId: string, limitMb: number) {
  return prisma.userStorageLimit.upsert({
    where: { userId },
    update: { limitMb },
    create: { userId, limitMb },
  });
}
