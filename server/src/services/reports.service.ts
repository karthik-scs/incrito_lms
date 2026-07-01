import { prisma } from "../lib/prisma";

/**
 * Per-course report rows — enrollments and average completion are aggregated across each
 * course's own cohorts (a course has no `Progress`/enrollment rows of its own, only its cohorts
 * do). Revenue uses the same honest derivation as the admin dashboard: enrollment count × the
 * course's current listed price, for non-free courses only — there's no separate Payment ledger.
 */
export async function getCourseReport() {
  const courses = await prisma.course.findMany({
    select: {
      id: true,
      title: true,
      status: true,
      isFree: true,
      priceInSmallestUnit: true,
      category: { select: { name: true } },
      cohorts: { select: { id: true, _count: { select: { enrollments: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  const cohortIds = courses.flatMap((c) => c.cohorts.map((co) => co.id));
  const cohortToCourse = new Map<string, string>();
  for (const c of courses) for (const co of c.cohorts) cohortToCourse.set(co.id, c.id);

  const [progressRows, certificateRows] = await Promise.all([
    cohortIds.length
      ? prisma.progress.findMany({ where: { cohortId: { in: cohortIds } }, select: { cohortId: true, completionPercentage: true } })
      : Promise.resolve([]),
    cohortIds.length
      ? prisma.certificate.groupBy({ by: ["cohortId"], where: { cohortId: { in: cohortIds } }, _count: { _all: true } })
      : Promise.resolve([]),
  ]);

  const progressByCourse = new Map<string, number[]>();
  for (const row of progressRows) {
    const courseId = cohortToCourse.get(row.cohortId);
    if (!courseId) continue;
    const list = progressByCourse.get(courseId) ?? [];
    list.push(row.completionPercentage);
    progressByCourse.set(courseId, list);
  }

  const certsByCourse = new Map<string, number>();
  for (const row of certificateRows) {
    const courseId = cohortToCourse.get(row.cohortId);
    if (!courseId) continue;
    certsByCourse.set(courseId, (certsByCourse.get(courseId) ?? 0) + row._count._all);
  }

  return courses.map((c) => {
    const enrollments = c.cohorts.reduce((sum, co) => sum + co._count.enrollments, 0);
    const percentages = progressByCourse.get(c.id) ?? [];
    const avgCompletion = percentages.length ? Math.round(percentages.reduce((s, p) => s + p, 0) / percentages.length) : 0;
    const revenue = c.isFree ? 0 : Math.round(((c.priceInSmallestUnit ?? 0) * enrollments) / 100);
    return {
      id: c.id,
      title: c.title,
      category: c.category?.name ?? "Uncategorized",
      status: c.status,
      enrollments,
      avgCompletion,
      certificatesIssued: certsByCourse.get(c.id) ?? 0,
      revenue,
    };
  });
}

/** Reuses the same cohort metrics already shown on the admin Cohort Management page. */
export async function getCohortReport() {
  const cohorts = await prisma.cohort.findMany({
    select: {
      id: true,
      name: true,
      status: true,
      startDate: true,
      endDate: true,
      course: { select: { title: true } },
      _count: { select: { enrollments: true } },
    },
    orderBy: { startDate: "desc" },
  });

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

  return cohorts.map((c) => {
    const percentages = byCohort.get(c.id) ?? [];
    const avgCompletion = percentages.length ? Math.round(percentages.reduce((s, p) => s + p, 0) / percentages.length) : 0;
    return {
      id: c.id,
      name: c.name,
      courseTitle: c.course.title,
      status: c.status,
      startDate: c.startDate,
      endDate: c.endDate,
      enrolled: c._count.enrollments,
      avgCompletion,
    };
  });
}
