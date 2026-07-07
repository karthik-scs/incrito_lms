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

/** Map each notification type to the preference field that gates it. */
const PREF_FIELD: Partial<Record<NotificationType, "enrollmentEmails" | "announcementEmails" | "certificateEmails" | "liveClassEmails">> = {
  ENROLLMENT: "enrollmentEmails",
  CLASS_SCHEDULED: "liveClassEmails",
  CLASS_REMINDER: "liveClassEmails",
  CERTIFICATE_ISSUED: "certificateEmails",
  ANNOUNCEMENT: "announcementEmails",
};

async function isNotificationAllowed(userId: string, type: NotificationType): Promise<boolean> {
  const prefField = PREF_FIELD[type];
  if (!prefField) return true;
  const pref = await prisma.notificationPreference.findUnique({ where: { userId } });
  if (!pref) return true;
  if (!pref.emailEnabled) return false;
  return pref[prefField] !== false;
}

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
  if (!(await isNotificationAllowed(userId, type))) return null;
  const notification = await prisma.notification.create({ data: { userId, type, title, message, metadata } });
  const { emitToUser } = await import("./sse.service");
  emitToUser(userId, "notification", { id: notification.id, type, title });
  return notification;
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
  const candidates = enrollments.map((e) => e.userId).filter((id) => id !== excludeUserId);
  if (candidates.length === 0) return;

  // Filter by per-user preferences
  const allowed = await Promise.all(candidates.map(async (id) => ({ id, ok: await isNotificationAllowed(id, type) })));
  const userIds = allowed.filter((r) => r.ok).map((r) => r.id);
  if (userIds.length === 0) return;

  await prisma.notification.createMany({
    data: userIds.map((userId) => ({ userId, type, title, message, metadata })),
  });

  const { emitToUsers } = await import("./sse.service");
  emitToUsers(userIds, "notification", { type, title });
}
