import { prisma } from "../lib/prisma";
import { AppError } from "../utils/AppError";
import type { Prisma } from "../../../app/generated/prisma/client";

type NotificationType =
  | "ENROLLMENT"
  | "CLASS_SCHEDULED"
  | "CLASS_REMINDER"
  | "ASSIGNMENT_GRADED"
  | "CERTIFICATE_ISSUED"
  | "ANNOUNCEMENT";

export function listMine(userId: string, limit = 20) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export function countUnread(userId: string) {
  return prisma.notification.count({ where: { userId, isRead: false } });
}

async function getOwned(id: string, userId: string) {
  const notification = await prisma.notification.findUnique({ where: { id } });
  if (!notification || notification.userId !== userId) {
    throw new AppError("Notification not found", 404);
  }
  return notification;
}

export async function markRead(id: string, userId: string) {
  await getOwned(id, userId);
  return prisma.notification.update({ where: { id }, data: { isRead: true, readAt: new Date() } });
}

export async function markAllRead(userId: string) {
  await prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true, readAt: new Date() } });
}

export async function dismiss(id: string, userId: string) {
  await getOwned(id, userId);
  await prisma.notification.delete({ where: { id } });
}

export async function notifyUser(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  metadata?: Prisma.InputJsonValue
) {
  return prisma.notification.create({ data: { userId, type, title, message, metadata } });
}

export async function notifyCohort(
  cohortId: string,
  type: NotificationType,
  title: string,
  message: string,
  metadata?: Prisma.InputJsonValue,
  excludeUserId?: string
) {
  const enrollments = await prisma.enrollment.findMany({ where: { cohortId }, select: { userId: true } });
  const userIds = enrollments.map((e) => e.userId).filter((id) => id !== excludeUserId);
  if (userIds.length === 0) return;

  await prisma.notification.createMany({
    data: userIds.map((userId) => ({ userId, type, title, message, metadata })),
  });
}
