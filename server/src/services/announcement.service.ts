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

/** Returns the IDs of all members (students) enrolled in cohorts assigned to this CM or mentor. */
async function getCohortMemberIds(userId: string, roleName: string): Promise<string[]> {
  let cohortIds: string[] = [];
  if (roleName === "Cohort Manager") {
    const assignments = await prisma.cohortManagerAssignment.findMany({
      where: { userId },
      select: { cohortId: true },
    });
    cohortIds = assignments.map((a) => a.cohortId);
  } else if (roleName === "Mentor") {
    const assignments = await prisma.cohortMentor.findMany({
      where: { userId },
      select: { cohortId: true },
    });
    cohortIds = assignments.map((a) => a.cohortId);
  }
  if (cohortIds.length === 0) return [];
  const enrollments = await prisma.enrollment.findMany({
    where: { cohortId: { in: cohortIds } },
    select: { userId: true },
  });
  return [...new Set(enrollments.map((e) => e.userId))];
}

export async function listAnnouncements(requesterId: string, requesterRole: string) {
  const where = ["Mentor", "Cohort Manager"].includes(requesterRole)
    ? { createdById: requesterId }
    : {};

  const announcements = await prisma.announcement.findMany({
    where,
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
  data: { title: string; content: string; audience?: "ALL" | "STUDENTS" | "MENTORS" | "COHORT_MANAGERS" },
  createdById: string,
  creatorRole: string
) {
  const isScopedRole = creatorRole === "Mentor" || creatorRole === "Cohort Manager";

  // CM/Mentor always send to their own cohort members, ignoring audience field
  const audience = isScopedRole ? "ALL" : (data.audience ?? "ALL");

  const announcement = await prisma.announcement.create({
    data: { title: data.title, content: data.content, audience, createdById },
    include: { createdBy: { select: { id: true, firstName: true, lastName: true } } },
  });

  let targetUserIds: string[];
  if (isScopedRole) {
    targetUserIds = (await getCohortMemberIds(createdById, creatorRole)).filter((id) => id !== createdById);
  } else {
    targetUserIds = (await getTargetUserIds(audience)).filter((id) => id !== createdById);
  }

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

export async function deleteAnnouncement(id: string, requesterId: string, requesterRole: string) {
  const announcement = await prisma.announcement.findUnique({ where: { id } });
  if (!announcement) throw new AppError("Announcement not found", 404);

  const isScopedRole = requesterRole === "Mentor" || requesterRole === "Cohort Manager";
  if (isScopedRole && announcement.createdById !== requesterId) {
    throw new AppError("You can only delete your own announcements", 403);
  }

  await prisma.announcement.delete({ where: { id } });
}
