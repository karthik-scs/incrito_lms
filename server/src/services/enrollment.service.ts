import { prisma } from "../lib/prisma";
import { AppError } from "../utils/AppError";
import { notifyUser } from "./notification.service";
import { addDuration } from "../lib/planDuration";

type EnrollmentStatus = "PENDING" | "ACTIVE" | "COMPLETED" | "DROPPED";
type PlanTier = "ICAP" | "INTENSIVE_PRO";

const enrollmentInclude = {
  user: { select: { id: true, firstName: true, lastName: true, email: true } },
  cohort: { select: { id: true, name: true, courseId: true, course: { select: { title: true } } } },
} as const;

export function listEnrollments(filter: { cohortId?: string; userId?: string }) {
  return prisma.enrollment.findMany({
    where: { cohortId: filter.cohortId, userId: filter.userId },
    include: enrollmentInclude,
    orderBy: { enrolledAt: "desc" },
  });
}

/** Snapshots LMS/recording access expiry from the plan's *current* duration settings — never recomputed later. */
async function computeAccessExpiry(plan: PlanTier, from: Date) {
  const setting = await prisma.planSetting.findUnique({ where: { plan } });
  if (!setting) throw new AppError("Plan setting not configured", 500);
  return {
    lmsAccessExpiresAt: addDuration(from, setting.lmsAccessDurationValue, setting.lmsAccessDurationUnit),
    recordingAccessExpiresAt: addDuration(from, setting.recordingAccessDurationValue, setting.recordingAccessDurationUnit),
  };
}

export async function createEnrollment(data: {
  userId: string;
  cohortId: string;
  status?: EnrollmentStatus;
  plan?: PlanTier;
}) {
  const [user, cohort] = await Promise.all([
    prisma.user.findUnique({ where: { id: data.userId } }),
    prisma.cohort.findUnique({ where: { id: data.cohortId } }),
  ]);
  if (!user) throw new AppError("User not found", 404);
  if (!cohort) throw new AppError("Cohort not found", 404);

  const existing = await prisma.enrollment.findUnique({
    where: { userId_cohortId: { userId: data.userId, cohortId: data.cohortId } },
  });
  if (existing) throw new AppError("User is already enrolled in this cohort", 409);

  const plan = data.plan ?? "ICAP";
  const enrolledAt = new Date();
  const { lmsAccessExpiresAt, recordingAccessExpiresAt } = await computeAccessExpiry(plan, enrolledAt);

  const enrollment = await prisma.enrollment.create({
    data: {
      userId: data.userId,
      cohortId: data.cohortId,
      status: data.status ?? "ACTIVE",
      plan,
      enrolledAt,
      lmsAccessExpiresAt,
      recordingAccessExpiresAt,
    },
    include: enrollmentInclude,
  });

  await notifyUser(
    data.userId,
    "ENROLLMENT",
    "You've been enrolled",
    `You've been enrolled in "${enrollment.cohort.name}" (${enrollment.cohort.course.title}).`,
    { cohortId: data.cohortId }
  ).catch(() => null);

  return enrollment;
}

async function getEnrollment(id: string) {
  const enrollment = await prisma.enrollment.findUnique({ where: { id } });
  if (!enrollment) {
    throw new AppError("Enrollment not found", 404);
  }
  return enrollment;
}

export async function updateEnrollmentStatus(id: string, status: EnrollmentStatus) {
  await getEnrollment(id);
  return prisma.enrollment.update({ where: { id }, data: { status }, include: enrollmentInclude });
}

/** Re-snapshots access expiry from now using the new plan's current duration settings — used for plan upgrades/downgrades. */
export async function updateEnrollmentPlan(id: string, plan: PlanTier) {
  await getEnrollment(id);
  const { lmsAccessExpiresAt, recordingAccessExpiresAt } = await computeAccessExpiry(plan, new Date());
  return prisma.enrollment.update({
    where: { id },
    data: { plan, lmsAccessExpiresAt, recordingAccessExpiresAt },
    include: enrollmentInclude,
  });
}

export async function deleteEnrollment(id: string) {
  await getEnrollment(id);
  await prisma.enrollment.delete({ where: { id } });
}
