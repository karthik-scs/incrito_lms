import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { AppError } from "../utils/AppError";
import { env } from "../config/env";

const userSelect = {
  id: true,
  email: true,
  mobileNumber: true,
  firstName: true,
  lastName: true,
  avatarUrl: true,
  status: true,
  createdAt: true,
  role: { select: { id: true, name: true, isSystem: true } },
} as const;

/**
 * The bootstrap admin (`SEED_ADMIN_EMAIL`) is the platform's root account — it's the only way
 * back in if every other admin gets locked out, so it's hidden from user-management UI and
 * protected from being edited, suspended, or role-changed through this same UI.
 */
function isSuperAdmin(email: string) {
  return Boolean(env.SEED_ADMIN_EMAIL) && email === env.SEED_ADMIN_EMAIL;
}

async function assertNotSuperAdmin(id: string) {
  const user = await prisma.user.findUnique({ where: { id }, select: { email: true } });
  if (user && isSuperAdmin(user.email)) {
    throw new AppError("This account can't be edited from here", 403);
  }
}

export function listUsers() {
  return prisma.user.findMany({
    where: env.SEED_ADMIN_EMAIL ? { email: { not: env.SEED_ADMIN_EMAIL } } : undefined,
    select: userSelect,
    orderBy: { createdAt: "desc" },
  });
}

export async function createUser(data: {
  email: string;
  firstName: string;
  lastName: string;
  mobileNumber?: string;
  password: string;
  roleId: string;
}) {
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    throw new AppError("A user with this email already exists", 409);
  }

  const role = await prisma.role.findUnique({ where: { id: data.roleId } });
  if (!role) {
    throw new AppError("Role not found", 404);
  }

  const passwordHash = await bcrypt.hash(data.password, 12);

  return prisma.user.create({
    data: {
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      mobileNumber: data.mobileNumber,
      passwordHash,
      roleId: data.roleId,
      status: "ACTIVE",
      emailVerifiedAt: new Date(),
    },
    select: userSelect,
  });
}

export async function getUser(id: string) {
  const user = await prisma.user.findUnique({ where: { id }, select: userSelect });
  if (!user) {
    throw new AppError("User not found", 404);
  }
  return user;
}

export async function updateUserStatus(id: string, status: "ACTIVE" | "SUSPENDED" | "INVITED") {
  await getUser(id);
  await assertNotSuperAdmin(id);
  return prisma.user.update({ where: { id }, data: { status }, select: userSelect });
}

export async function updateUserRole(id: string, roleId: string) {
  await getUser(id);
  await assertNotSuperAdmin(id);
  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role) {
    throw new AppError("Role not found", 404);
  }
  return prisma.user.update({ where: { id }, data: { roleId }, select: userSelect });
}

export async function deleteUser(id: string) {
  await getUser(id);
  await assertNotSuperAdmin(id);

  // Block deletion if the user is assigned to courses — those FKs are non-nullable
  // and cannot be cascade-deleted without destroying course data.
  const courseCount = await prisma.course.count({
    where: { OR: [{ mentorId: id }, { createdById: id }] },
  });
  if (courseCount > 0) {
    throw new AppError(
      "Cannot delete this user — they are assigned to one or more courses. Reassign those courses first.",
      409
    );
  }

  // WebRTC call sessions (caller and callee — no cascade on either FK)
  await prisma.callSession.deleteMany({ where: { OR: [{ callerId: id }, { calleeId: id }] } });

  // Submissions this user graded — null out the grader FK (nullable but no onDelete: SetNull)
  await prisma.submission.updateMany({ where: { gradedById: id }, data: { gradedById: null } });

  // Content authored by the user (reactions first so comment/post deletes don't race with FK)
  await prisma.reaction.deleteMany({ where: { userId: id } });
  await prisma.pollVote.deleteMany({ where: { userId: id } });
  // Replies cascade from parent comment, so deleting top-level comments also removes replies.
  await prisma.comment.deleteMany({ where: { authorId: id } });
  await prisma.post.deleteMany({ where: { authorId: id } });
  await prisma.chatMessage.deleteMany({ where: { senderId: id } });

  // Admin/Mentor authored content (cascades handle child rows)
  await prisma.communityEvent.deleteMany({ where: { createdById: id } });
  await prisma.poll.deleteMany({ where: { createdById: id } });
  await prisma.announcement.deleteMany({ where: { createdById: id } });
  await prisma.community.deleteMany({ where: { createdById: id } });

  // Assignments / assessments created by this user — delete others' submissions/attempts first
  await prisma.submission.deleteMany({ where: { assignment: { createdById: id } } });
  await prisma.assignment.deleteMany({ where: { createdById: id } });
  await prisma.assessmentAttempt.deleteMany({ where: { assessment: { createdById: id } } });
  await prisma.assessment.deleteMany({ where: { createdById: id } });

  // Live classes hosted by this user — Attendance has no cascade from LiveClass, so delete first
  const hostedClasses = await prisma.liveClass.findMany({
    where: { mentorId: id },
    select: { id: true },
  });
  if (hostedClasses.length > 0) {
    const classIds = hostedClasses.map((c) => c.id);
    await prisma.attendance.deleteMany({ where: { liveClassId: { in: classIds } } });
    await prisma.liveClass.deleteMany({ where: { mentorId: id } });
  }

  // Group call slots (mentor side) — deletes cascade to GroupCallRequest rows for those slots.
  await prisma.groupCallRequest.deleteMany({ where: { studentId: id } });
  await prisma.groupCallSlot.deleteMany({ where: { mentorId: id } });

  // Activity and progress records
  await prisma.attendance.deleteMany({ where: { userId: id } });
  await prisma.lessonProgress.deleteMany({ where: { userId: id } });
  await prisma.submission.deleteMany({ where: { userId: id } });
  await prisma.assessmentAttempt.deleteMany({ where: { userId: id } });
  await prisma.progress.deleteMany({ where: { userId: id } });
  await prisma.leaderboardEntry.deleteMany({ where: { userId: id } });
  await prisma.certificate.deleteMany({ where: { userId: id } });

  // Membership records
  await prisma.communityMember.deleteMany({ where: { userId: id } });
  await prisma.enrollment.deleteMany({ where: { userId: id } });
  await prisma.userLiveAccount.deleteMany({ where: { userId: id } });

  // Role / cohort assignments
  await prisma.cohortManagerAssignment.deleteMany({ where: { userId: id } });
  await prisma.cohortMentor.deleteMany({ where: { userId: id } });
  await prisma.mentorRating.deleteMany({ where: { OR: [{ mentorId: id }, { studentId: id }] } });
  await prisma.mentorBooking.deleteMany({ where: { OR: [{ mentorId: id }, { studentId: id }] } });

  // Auth / session records
  await prisma.session.deleteMany({ where: { userId: id } });
  await prisma.notification.deleteMany({ where: { userId: id } });
  await prisma.verificationCode.deleteMany({ where: { userId: id } });

  // ConversationParticipant, NotificationPreference, MentorAvailability, FileUpload,
  // and UserStorageLimit all have onDelete: Cascade and are removed automatically.
  await prisma.user.delete({ where: { id } });
}

export async function updateUser(
  id: string,
  data: {
    email?: string;
    firstName?: string;
    lastName?: string;
    mobileNumber?: string;
    roleId?: string;
    status?: "ACTIVE" | "SUSPENDED" | "INVITED";
    password?: string;
  }
) {
  await getUser(id);
  await assertNotSuperAdmin(id);

  if (data.email) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing && existing.id !== id) {
      throw new AppError("A user with this email already exists", 409);
    }
  }

  if (data.roleId) {
    const role = await prisma.role.findUnique({ where: { id: data.roleId } });
    if (!role) {
      throw new AppError("Role not found", 404);
    }
  }

  const { password, ...rest } = data;

  return prisma.user.update({
    where: { id },
    data: {
      ...rest,
      ...(password ? { passwordHash: await bcrypt.hash(password, 12) } : {}),
    },
    select: userSelect,
  });
}
