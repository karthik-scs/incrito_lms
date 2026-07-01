import { prisma } from "../lib/prisma";
import { AppError } from "../utils/AppError";

const cohortInclude = {
  course: { select: { id: true, title: true, slug: true, category: { select: { id: true, name: true } } } },
  managers: { include: { user: { select: { id: true, firstName: true, lastName: true } } } },
  mentors: { include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } } },
  _count: { select: { enrollments: true } },
} as const;

/** A student's completion is below this on a non-archived/cancelled cohort counts as "at risk." */
const AT_RISK_COMPLETION_THRESHOLD = 30;

/** Attaches avg completion % and at-risk count to each cohort, computed from real `Progress` rows. */
export async function withCohortMetrics<T extends { id: string }>(cohorts: T[]) {
  if (cohorts.length === 0) return [] as (T & { avgCompletionPercentage: number; atRiskCount: number })[];

  const progressRows = await prisma.progress.findMany({
    where: { cohortId: { in: cohorts.map((c) => c.id) } },
    select: { cohortId: true, completionPercentage: true },
  });

  const byCohort = new Map<string, number[]>();
  for (const row of progressRows) {
    const list = byCohort.get(row.cohortId) ?? [];
    list.push(row.completionPercentage);
    byCohort.set(row.cohortId, list);
  }

  return cohorts.map((cohort) => {
    const percentages = byCohort.get(cohort.id) ?? [];
    const avgCompletionPercentage = percentages.length
      ? Math.round(percentages.reduce((sum, p) => sum + p, 0) / percentages.length)
      : 0;
    const atRiskCount = percentages.filter((p) => p < AT_RISK_COMPLETION_THRESHOLD).length;
    return { ...cohort, avgCompletionPercentage, atRiskCount };
  });
}

export async function listCohorts(filter: { courseId?: string }) {
  const cohorts = await prisma.cohort.findMany({
    where: { courseId: filter.courseId },
    include: cohortInclude,
    orderBy: { startDate: "desc" },
  });
  return withCohortMetrics(cohorts);
}

export async function getCohort(id: string) {
  const cohort = await prisma.cohort.findUnique({ where: { id }, include: cohortInclude });
  if (!cohort) {
    throw new AppError("Cohort not found", 404);
  }
  const [withMetric] = await withCohortMetrics([cohort]);
  return withMetric;
}

type CohortInput = {
  courseId: string;
  name: string;
  managerIds?: string[];
  mentorIds?: string[];
  status?: "ACTIVE" | "UPCOMING" | "COMPLETED" | "CANCELLED" | "ARCHIVED";
  startDate: Date;
  endDate?: Date;
  capacity?: number;
};

export async function createCohort(data: CohortInput) {
  const course = await prisma.course.findUnique({ where: { id: data.courseId } });
  if (!course) {
    throw new AppError("Course not found", 404);
  }

  const { mentorIds, managerIds, ...cohortFields } = data;

  const cohort = await prisma.cohort.create({
    data: {
      ...cohortFields,
      mentors: mentorIds ? { create: mentorIds.map((userId) => ({ userId })) } : undefined,
      managers: managerIds ? { create: managerIds.map((userId) => ({ userId })) } : undefined,
    },
    include: cohortInclude,
  });
  const [withMetric] = await withCohortMetrics([cohort]);
  return withMetric;
}

export async function updateCohort(id: string, data: Partial<Omit<CohortInput, "courseId">>) {
  await getCohort(id);

  const { mentorIds, managerIds, ...cohortFields } = data;

  if (mentorIds) {
    await prisma.cohortMentor.deleteMany({ where: { cohortId: id } });
  }
  if (managerIds) {
    await prisma.cohortManagerAssignment.deleteMany({ where: { cohortId: id } });
  }

  const cohort = await prisma.cohort.update({
    where: { id },
    data: {
      ...cohortFields,
      mentors: mentorIds ? { create: mentorIds.map((userId) => ({ userId })) } : undefined,
      managers: managerIds ? { create: managerIds.map((userId) => ({ userId })) } : undefined,
    },
    include: cohortInclude,
  });
  const [withMetric] = await withCohortMetrics([cohort]);
  return withMetric;
}

export async function addCohortMentor(cohortId: string, userId: string) {
  await getCohort(cohortId);
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AppError("User not found", 404);
  }
  await prisma.cohortMentor.upsert({
    where: { cohortId_userId: { cohortId, userId } },
    update: {},
    create: { cohortId, userId },
  });
  return getCohort(cohortId);
}

export async function removeCohortMentor(cohortId: string, userId: string) {
  await getCohort(cohortId);
  await prisma.cohortMentor.deleteMany({ where: { cohortId, userId } });
  return getCohort(cohortId);
}

export async function addCohortManager(cohortId: string, userId: string) {
  await getCohort(cohortId);
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AppError("User not found", 404);
  }
  await prisma.cohortManagerAssignment.upsert({
    where: { cohortId_userId: { cohortId, userId } },
    update: {},
    create: { cohortId, userId },
  });
  return getCohort(cohortId);
}

export async function removeCohortManager(cohortId: string, userId: string) {
  await getCohort(cohortId);
  await prisma.cohortManagerAssignment.deleteMany({ where: { cohortId, userId } });
  return getCohort(cohortId);
}

/** Every manager/mentor/student belonging to this cohort — used for @mention autocomplete in the cohort discussion. Caller must be a member or Admin. */
export async function listCohortMembers(cohortId: string, userId: string) {
  const cohort = await prisma.cohort.findUnique({ where: { id: cohortId } });
  if (!cohort) {
    throw new AppError("Cohort not found", 404);
  }

  const [managers, mentors, enrollments] = await Promise.all([
    prisma.cohortManagerAssignment.findMany({ where: { cohortId }, select: { userId: true } }),
    prisma.cohortMentor.findMany({ where: { cohortId }, select: { userId: true } }),
    prisma.enrollment.findMany({ where: { cohortId }, select: { userId: true } }),
  ]);
  const memberIds = Array.from(
    new Set([...managers.map((m) => m.userId), ...mentors.map((m) => m.userId), ...enrollments.map((e) => e.userId)])
  );

  const requester = await prisma.user.findUnique({ where: { id: userId }, include: { role: true } });
  if (requester?.role.name !== "Admin" && !memberIds.includes(userId)) {
    throw new AppError("You don't have access to this cohort's member list", 403);
  }

  const users = await prisma.user.findMany({
    where: { id: { in: memberIds } },
    select: { id: true, firstName: true, lastName: true, avatarUrl: true, role: { select: { name: true } } },
    orderBy: { firstName: "asc" },
  });

  return users.map((u) => ({ ...u, isSelf: u.id === userId }));
}

export async function getCohortProgress(cohortId: string) {
  await getCohort(cohortId);

  const enrollments = await prisma.enrollment.findMany({
    where: { cohortId },
    include: { user: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } } },
  });

  const progressRows = await prisma.progress.findMany({ where: { cohortId } });
  const progressByUser = new Map(progressRows.map((p) => [p.userId, p]));

  return enrollments.map((enrollment) => ({
    enrollmentId: enrollment.id,
    user: enrollment.user,
    status: enrollment.status,
    completionPercentage: progressByUser.get(enrollment.userId)?.completionPercentage ?? 0,
    lastActivityAt: progressByUser.get(enrollment.userId)?.lastActivityAt ?? null,
  }));
}

/** Aggregate stats across every non-archived cohort, for the Cohort Management dashboard cards. */
export async function getCohortStats() {
  const cohorts = await prisma.cohort.findMany({
    where: { status: { not: "ARCHIVED" } },
    select: { id: true, status: true },
  });
  const cohortIds = cohorts.map((c) => c.id);

  const [totalEnrolled, progressRows] = await Promise.all([
    cohortIds.length ? prisma.enrollment.count({ where: { cohortId: { in: cohortIds } } }) : 0,
    cohortIds.length
      ? prisma.progress.findMany({ where: { cohortId: { in: cohortIds } }, select: { completionPercentage: true } })
      : [],
  ]);

  const avgGradeRate = progressRows.length
    ? Math.round(progressRows.reduce((sum, p) => sum + p.completionPercentage, 0) / progressRows.length)
    : 0;
  const atRiskStudents = progressRows.filter((p) => p.completionPercentage < AT_RISK_COMPLETION_THRESHOLD).length;

  return {
    totalEnrolled,
    activeCohorts: cohorts.filter((c) => c.status === "ACTIVE").length,
    upcomingCohorts: cohorts.filter((c) => c.status === "UPCOMING").length,
    avgGradeRate,
    atRiskStudents,
  };
}
