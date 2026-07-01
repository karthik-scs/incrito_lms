import { prisma } from "../lib/prisma";
import { AppError } from "../utils/AppError";

const ROLE_NAME_BY_AUDIENCE: Record<string, string | null> = {
  ALL: null,
  STUDENTS: "Student",
  MENTORS: "Mentor",
  COHORT_MANAGERS: "Cohort Manager",
};

async function getTargetUserIds(audience: string) {
  const roleName = ROLE_NAME_BY_AUDIENCE[audience];
  const users = await prisma.user.findMany({
    where: roleName ? { role: { name: roleName } } : undefined,
    select: { id: true },
  });
  return users.map((u) => u.id);
}

export async function listAnnouncements() {
  const announcements = await prisma.announcement.findMany({
    orderBy: { createdAt: "desc" },
    include: { createdBy: { select: { id: true, firstName: true, lastName: true } } },
  });

  return Promise.all(
    announcements.map(async (a) => ({
      ...a,
      recipientCount: (await getTargetUserIds(a.audience)).length,
    }))
  );
}

export async function createAnnouncement(
  data: { title: string; content: string; audience: "ALL" | "STUDENTS" | "MENTORS" | "COHORT_MANAGERS" },
  createdById: string
) {
  const announcement = await prisma.announcement.create({
    data: { ...data, createdById },
    include: { createdBy: { select: { id: true, firstName: true, lastName: true } } },
  });

  const targetUserIds = (await getTargetUserIds(data.audience)).filter((id) => id !== createdById);
  if (targetUserIds.length > 0) {
    await prisma.notification.createMany({
      data: targetUserIds.map((userId) => ({
        userId,
        type: "ANNOUNCEMENT" as const,
        title: data.title,
        message: data.content,
        metadata: { announcementId: announcement.id },
      })),
    });
  }

  return { ...announcement, recipientCount: targetUserIds.length };
}

export async function deleteAnnouncement(id: string) {
  const announcement = await prisma.announcement.findUnique({ where: { id } });
  if (!announcement) {
    throw new AppError("Announcement not found", 404);
  }
  await prisma.announcement.delete({ where: { id } });
}
