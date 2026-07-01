import { prisma } from "../lib/prisma";
import { isLiveNow } from "./lesson.service";
import { withCohortMetrics } from "./cohort.service";

const liveClassSelect = {
  include: { mentor: { select: { id: true, firstName: true, lastName: true } } },
} as const;

function withComputedLive<T extends { startTime: Date; status: string }>(liveClass: T) {
  return { ...liveClass, isLiveNow: isLiveNow(liveClass) };
}

export async function getStudentDashboard(userId: string) {
  const enrollments = await prisma.enrollment.findMany({
    where: { userId },
    include: { cohort: { include: { course: { include: { modules: { include: { lessons: true } } } } } } },
  });

  const courseSummaries = await Promise.all(
    enrollments.map(async (enrollment) => {
      const lessons = enrollment.cohort.course.modules.flatMap((m) => m.lessons).sort((a, b) => a.order - b.order);
      const lessonIds = lessons.map((l) => l.id);
      const completedCount = lessonIds.length
        ? await prisma.lessonProgress.count({ where: { userId, lessonId: { in: lessonIds }, completed: true } })
        : 0;
      const nextLesson = lessonIds.length
        ? await prisma.lessonProgress
            .findMany({ where: { userId, lessonId: { in: lessonIds }, completed: true }, select: { lessonId: true } })
            .then((rows) => {
              const completedIds = new Set(rows.map((r) => r.lessonId));
              return lessons.find((l) => !completedIds.has(l.id)) ?? null;
            })
        : null;

      return {
        enrollmentId: enrollment.id,
        cohortId: enrollment.cohortId,
        cohortName: enrollment.cohort.name,
        courseId: enrollment.cohort.course.id,
        courseSlug: enrollment.cohort.course.slug,
        courseTitle: enrollment.cohort.course.title,
        thumbnailUrl: enrollment.cohort.course.thumbnailUrl,
        progressPercent: lessonIds.length ? Math.round((completedCount / lessonIds.length) * 100) : 0,
        totalLessons: lessonIds.length,
        completedLessons: completedCount,
        nextLessonId: nextLesson?.id ?? null,
        nextLessonTitle: nextLesson?.title ?? null,
        isComplete: lessonIds.length > 0 && completedCount === lessonIds.length,
      };
    })
  );

  const cohortIds = enrollments.map((e) => e.cohortId);
  const courseIds = Array.from(new Set(courseSummaries.map((c) => c.courseId)));

  const upcomingLive = courseIds.length
    ? await prisma.lesson.findMany({
        where: { type: "LIVE", module: { courseId: { in: courseIds } }, liveClass: { status: { not: "CANCELLED" } } },
        include: { liveClass: liveClassSelect, module: { select: { courseId: true } } },
        orderBy: { liveClass: { startTime: "asc" } },
        take: 20,
      })
    : [];

  const liveEvents = upcomingLive
    .filter((l) => l.liveClass)
    .map((l) => {
      const course = courseSummaries.find((c) => c.courseId === l.module.courseId);
      return {
        lessonId: l.id,
        title: l.title,
        courseTitle: course?.courseTitle ?? "",
        courseSlug: course?.courseSlug ?? "",
        liveClass: withComputedLive(l.liveClass!),
      };
    })
    .filter((e) => e.liveClass.status !== "COMPLETED")
    .sort((a, b) => a.liveClass.startTime.getTime() - b.liveClass.startTime.getTime())
    .slice(0, 5);

  const [notifications, certificates] = await Promise.all([
    prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.certificate.count({ where: { userId } }),
  ]);

  return {
    stats: {
      enrolledCourses: courseSummaries.length,
      completedCourses: courseSummaries.filter((c) => c.isComplete).length,
      upcomingLiveClasses: liveEvents.filter((e) => e.liveClass.status !== "COMPLETED").length,
      certificatesEarned: certificates,
    },
    courses: courseSummaries.sort((a, b) => b.progressPercent - a.progressPercent),
    upcomingLive: liveEvents,
    notifications,
    cohortIds,
  };
}

export async function getMentorDashboard(userId: string) {
  const mentorships = await prisma.cohortMentor.findMany({ where: { userId }, select: { cohortId: true } });
  const cohortIds = mentorships.map((m) => m.cohortId);

  const cohorts = cohortIds.length
    ? await prisma.cohort.findMany({
        where: { id: { in: cohortIds } },
        include: {
          course: { select: { id: true, title: true, slug: true } },
          _count: { select: { enrollments: true } },
        },
        orderBy: { startDate: "desc" },
      })
    : [];
  const cohortsWithMetrics = await withCohortMetrics(cohorts);

  const courseIds = Array.from(new Set(cohorts.map((c) => c.course.id)));

  const upcomingLive = await prisma.liveClass.findMany({
    where: { mentorId: userId, status: { not: "CANCELLED" } },
    include: { mentor: { select: { id: true, firstName: true, lastName: true } }, lesson: { select: { id: true, title: true } } },
    orderBy: { startTime: "asc" },
    take: 20,
  });
  const liveEvents = upcomingLive
    .map((lc) => withComputedLive(lc))
    .filter((lc) => lc.status !== "COMPLETED")
    .slice(0, 5);

  const pendingSubmissions = courseIds.length
    ? await prisma.submission.findMany({
        where: { status: { in: ["SUBMITTED", "RESUBMITTED"] }, assignment: { course: { mentorId: userId } } },
        include: {
          assignment: { select: { title: true, maxMarks: true, course: { select: { title: true, slug: true } } } },
          user: { select: { firstName: true, lastName: true } },
        },
        orderBy: { submittedAt: "desc" },
        take: 5,
      })
    : [];

  const totalStudents = cohorts.reduce((sum, c) => sum + c._count.enrollments, 0);

  return {
    stats: {
      myCohorts: cohorts.length,
      myStudents: totalStudents,
      upcomingLiveClasses: liveEvents.length,
      pendingGrading: pendingSubmissions.length,
    },
    cohorts: cohortsWithMetrics,
    upcomingLive: liveEvents,
    pendingSubmissions,
  };
}

export async function getManagerDashboard(userId: string) {
  const assignments = await prisma.cohortManagerAssignment.findMany({ where: { userId }, select: { cohortId: true } });
  const cohortIds = assignments.map((a) => a.cohortId);

  const cohorts = cohortIds.length
    ? await prisma.cohort.findMany({
        where: { id: { in: cohortIds } },
        include: {
          course: { select: { id: true, title: true, slug: true } },
          _count: { select: { enrollments: true } },
        },
        orderBy: { startDate: "desc" },
      })
    : [];
  const cohortsWithMetrics = await withCohortMetrics(cohorts);

  const courseIds = Array.from(new Set(cohorts.map((c) => c.course.id)));

  const upcomingLive = courseIds.length
    ? await prisma.lesson.findMany({
        where: { type: "LIVE", module: { courseId: { in: courseIds } }, liveClass: { status: { not: "CANCELLED" } } },
        include: { liveClass: liveClassSelect, module: { select: { courseId: true } } },
        take: 20,
      })
    : [];
  const liveEvents = upcomingLive
    .filter((l) => l.liveClass)
    .map((l) => {
      const course = cohorts.find((c) => c.course.id === l.module.courseId);
      return { lessonId: l.id, title: l.title, courseTitle: course?.course.title ?? "", liveClass: withComputedLive(l.liveClass!) };
    })
    .filter((e) => e.liveClass.status !== "COMPLETED")
    .sort((a, b) => a.liveClass.startTime.getTime() - b.liveClass.startTime.getTime())
    .slice(0, 5);

  const recentEnrollments = cohortIds.length
    ? await prisma.enrollment.findMany({
        where: { cohortId: { in: cohortIds } },
        include: { user: { select: { firstName: true, lastName: true, avatarUrl: true } }, cohort: { select: { name: true } } },
        orderBy: { enrolledAt: "desc" },
        take: 5,
      })
    : [];

  const totalEnrolled = cohorts.reduce((sum, c) => sum + c._count.enrollments, 0);
  const totalAtRisk = cohortsWithMetrics.reduce((sum, c) => sum + c.atRiskCount, 0);
  const avgCompletion = cohortsWithMetrics.length
    ? Math.round(cohortsWithMetrics.reduce((sum, c) => sum + c.avgCompletionPercentage, 0) / cohortsWithMetrics.length)
    : 0;

  return {
    stats: {
      myCohorts: cohorts.length,
      totalEnrolled,
      atRiskStudents: totalAtRisk,
      avgCompletion,
    },
    cohorts: cohortsWithMetrics,
    upcomingLive: liveEvents,
    recentEnrollments,
  };
}

/** Last N month buckets ending this month, e.g. [{key:"2026-1", label:"Feb"}, ...]. */
function lastNMonths(n: number) {
  const months: { key: string; label: string; start: Date }[] = [];
  const cursor = new Date();
  cursor.setDate(1);
  cursor.setHours(0, 0, 0, 0);
  cursor.setMonth(cursor.getMonth() - (n - 1));
  for (let i = 0; i < n; i++) {
    months.push({
      key: `${cursor.getFullYear()}-${cursor.getMonth()}`,
      label: cursor.toLocaleString(undefined, { month: "short" }),
      start: new Date(cursor),
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return months;
}

/**
 * Platform-wide admin dashboard — every widget here is computed from real rows, no fabricated
 * numbers. Two honest exceptions to flag: (1) "Revenue" has no separate Payment/transaction
 * ledger yet, so it's derived as enrollment-count × the course's *current* listed price — accurate
 * for this app's actual sales model (one-time enrollment at listed price, no discounts/refunds
 * tracked) but would drift from a real payment history if pricing ever changes retroactively.
 * (2) The mockup's "Users by Country" has no backing data (no geo field on `User` and no plan to
 * add one) — replaced with "Users by Role", a real breakdown that fills the same bar-list slot.
 */
export async function getAdminDashboard() {
  const months = lastNMonths(6);
  const windowStart = months[0].start;

  const [totalUsers, activeCourses, totalCourses, totalCohorts, activeCohorts, totalEnrollments] = await Promise.all([
    prisma.user.count(),
    prisma.course.count({ where: { status: "PUBLISHED" } }),
    prisma.course.count(),
    prisma.cohort.count(),
    prisma.cohort.count({ where: { status: "ACTIVE" } }),
    prisma.enrollment.count(),
  ]);

  // --- User growth: cumulative user count at the end of each of the last 6 months ---
  const [usersBeforeWindow, recentUsers] = await Promise.all([
    prisma.user.count({ where: { createdAt: { lt: windowStart } } }),
    prisma.user.findMany({ where: { createdAt: { gte: windowStart } }, select: { createdAt: true } }),
  ]);
  const signupsByMonth = new Map(months.map((m) => [m.key, 0]));
  for (const u of recentUsers) {
    const key = `${u.createdAt.getFullYear()}-${u.createdAt.getMonth()}`;
    if (signupsByMonth.has(key)) signupsByMonth.set(key, (signupsByMonth.get(key) ?? 0) + 1);
  }
  let cumulative = usersBeforeWindow;
  const userGrowth = months.map((m) => {
    cumulative += signupsByMonth.get(m.key) ?? 0;
    return { month: m.label, users: cumulative };
  });

  // --- Enrollments overview: bucket every enrollment by its Progress.completionPercentage ---
  const [enrollments, progressRows] = await Promise.all([
    prisma.enrollment.findMany({ select: { userId: true, cohortId: true } }),
    prisma.progress.findMany({ select: { userId: true, cohortId: true, completionPercentage: true } }),
  ]);
  const progressMap = new Map(progressRows.map((p) => [`${p.userId}:${p.cohortId}`, p.completionPercentage]));
  let completed = 0;
  let inProgress = 0;
  let notStarted = 0;
  for (const e of enrollments) {
    const pct = progressMap.get(`${e.userId}:${e.cohortId}`) ?? 0;
    if (pct >= 100) completed++;
    else if (pct > 0) inProgress++;
    else notStarted++;
  }
  const enrollmentsOverview = [
    { name: "Completed", value: completed },
    { name: "In Progress", value: inProgress },
    { name: "Not Started", value: notStarted },
  ];

  // --- Top 5 courses by total enrollments across all their cohorts ---
  const cohortsWithCourse = await prisma.cohort.findMany({
    select: { courseId: true, course: { select: { title: true } }, _count: { select: { enrollments: true } } },
  });
  const courseEnrollmentMap = new Map<string, { title: string; enrollments: number }>();
  for (const c of cohortsWithCourse) {
    const existing = courseEnrollmentMap.get(c.courseId) ?? { title: c.course.title, enrollments: 0 };
    existing.enrollments += c._count.enrollments;
    courseEnrollmentMap.set(c.courseId, existing);
  }
  const topCourses = Array.from(courseEnrollmentMap.values())
    .sort((a, b) => b.enrollments - a.enrollments)
    .slice(0, 5)
    .map((c) => ({ course: c.title, enrollments: c.enrollments }));

  // --- Users by role (replaces the mockup's unsupported "Users by Country") ---
  const roleGroups = await prisma.user.groupBy({ by: ["roleId"], _count: { _all: true } });
  const roles = await prisma.role.findMany({ select: { id: true, name: true } });
  const roleNameMap = new Map(roles.map((r) => [r.id, r.name]));
  const usersByRole = roleGroups
    .map((g) => ({
      role: roleNameMap.get(g.roleId) ?? "Unknown",
      count: g._count._all,
      percentage: totalUsers ? Math.round((g._count._all / totalUsers) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // --- Revenue: enrollment count × course's current listed price, for non-free courses only ---
  const paidCohorts = await prisma.cohort.findMany({
    where: { course: { isFree: false } },
    select: {
      course: { select: { title: true, priceInSmallestUnit: true } },
      enrollments: { select: { enrolledAt: true } },
    },
  });
  const revenueByCourse = new Map<string, number>();
  const revenueByMonth = new Map(months.map((m) => [m.key, 0]));
  for (const cohort of paidCohorts) {
    const price = cohort.course.priceInSmallestUnit ?? 0;
    for (const enr of cohort.enrollments) {
      revenueByCourse.set(cohort.course.title, (revenueByCourse.get(cohort.course.title) ?? 0) + price);
      const key = `${enr.enrolledAt.getFullYear()}-${enr.enrolledAt.getMonth()}`;
      if (revenueByMonth.has(key)) revenueByMonth.set(key, (revenueByMonth.get(key) ?? 0) + price);
    }
  }
  const revenueOverview = Array.from(revenueByCourse.entries()).map(([source, paise]) => ({
    source,
    revenue: Math.round(paise / 100),
  }));
  const revenueTrend = months.map((m) => ({ month: m.label, revenue: Math.round((revenueByMonth.get(m.key) ?? 0) / 100) }));
  const totalRevenue = revenueOverview.reduce((sum, r) => sum + r.revenue, 0);

  // --- Platform health: real composite rates, not fabricated infra-status checks ---
  const [activeUsers, avgProgress] = await Promise.all([
    prisma.user.count({ where: { status: "ACTIVE" } }),
    prisma.progress.aggregate({ _avg: { completionPercentage: true } }),
  ]);
  const platformHealth = [
    { label: "Course Publish Rate", percentage: totalCourses ? Math.round((activeCourses / totalCourses) * 100) : 0 },
    { label: "Cohort Activity Rate", percentage: totalCohorts ? Math.round((activeCohorts / totalCohorts) * 100) : 0 },
    { label: "Average Completion", percentage: Math.round(avgProgress._avg.completionPercentage ?? 0) },
    { label: "Active User Rate", percentage: totalUsers ? Math.round((activeUsers / totalUsers) * 100) : 0 },
  ];

  // --- Recent activity: merge recent enrollments, certificate issuances, and course publishes ---
  const [recentEnrollments, recentCertificates, recentCourses] = await Promise.all([
    prisma.enrollment.findMany({
      orderBy: { enrolledAt: "desc" },
      take: 5,
      include: { user: { select: { firstName: true, lastName: true } }, cohort: { select: { course: { select: { title: true } } } } },
    }),
    prisma.certificate.findMany({
      orderBy: { issuedAt: "desc" },
      take: 5,
      include: { user: { select: { firstName: true, lastName: true } } },
    }),
    prisma.course.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: { title: true, updatedAt: true },
    }),
  ]);

  const activity = [
    ...recentEnrollments.map((e) => ({
      type: "enrollment" as const,
      text: `${e.user.firstName} ${e.user.lastName} enrolled in ${e.cohort.course.title}`,
      at: e.enrolledAt,
    })),
    ...recentCertificates.map((c) => ({
      type: "certificate" as const,
      text: `Certificate issued to ${c.user.firstName} ${c.user.lastName}`,
      at: c.issuedAt,
    })),
    ...recentCourses.map((c) => ({
      type: "course" as const,
      text: `Course published: "${c.title}"`,
      at: c.updatedAt,
    })),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 8);

  return {
    stats: { totalUsers, activeCourses, totalCohorts, totalEnrollments },
    userGrowth,
    enrollmentsOverview,
    topCourses,
    usersByRole,
    revenueOverview,
    revenueTrend,
    totalRevenue,
    platformHealth,
    activity,
  };
}
