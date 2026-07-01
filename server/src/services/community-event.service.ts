import { prisma } from "../lib/prisma";
import { AppError } from "../utils/AppError";

const authorSelect = {
  select: { id: true, firstName: true, lastName: true, avatarUrl: true, role: { select: { name: true } } },
} as const;

const CREATOR_ROLES = ["Admin", "Mentor", "Cohort Manager"];

async function assertMemberOrAdmin(communityId: string, userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { role: true } });
  if (user?.role.name === "Admin") return;
  const member = await prisma.communityMember.findUnique({ where: { communityId_userId: { communityId, userId } } });
  if (!member) throw new AppError("You are not a member of this community", 403);
}

export async function listEvents(communityId: string, userId: string) {
  await assertMemberOrAdmin(communityId, userId);
  return prisma.communityEvent.findMany({
    where: { communityId },
    include: { createdBy: authorSelect },
    orderBy: { startTime: "asc" },
  });
}

export async function createEvent(
  communityId: string,
  userId: string,
  data: { title: string; description?: string; startTime: Date; endTime?: Date; location?: string }
) {
  await assertMemberOrAdmin(communityId, userId);

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, include: { role: true } });
  if (!CREATOR_ROLES.includes(user.role.name)) {
    throw new AppError("Only admins, mentors, and cohort managers can create events", 403);
  }

  return prisma.communityEvent.create({
    data: { communityId, createdById: userId, ...data },
    include: { createdBy: authorSelect },
  });
}

export async function deleteEvent(eventId: string, userId: string, isAdmin: boolean) {
  const event = await prisma.communityEvent.findUnique({ where: { id: eventId } });
  if (!event) {
    throw new AppError("Event not found", 404);
  }
  if (event.createdById !== userId && !isAdmin) {
    throw new AppError("You can only delete your own events", 403);
  }
  await prisma.communityEvent.delete({ where: { id: eventId } });
}
