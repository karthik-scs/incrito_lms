import { prisma } from "../lib/prisma";
import { AppError } from "../utils/AppError";
import { isLiveNow } from "./lesson.service";

/**
 * When `plan` is given, only counts lessons that plan tier can actually access (cascading the
 * same Course→Module→Lesson rule the roadmap lock uses) — so an ICAP student's course completion,
 * leaderboard points, and certificate eligibility are all scoped to what ICAP actually unlocks,
 * not penalized by Intensive-Pro-only content they were never going to see.
 */
async function getCourseLessonIds(courseId: string, plan?: string) {
  const modules = await prisma.module.findMany({
    where: { courseId },
    include: { lessons: { select: { id: true, planAccess: true } } },
  });
  const isAccessible = (planAccess: string) => !plan || planAccess === "BOTH" || planAccess === plan;
  return modules.flatMap((m) => (isAccessible(m.planAccess) ? m.lessons.filter((l) => isAccessible(l.planAccess)).map((l) => l.id) : []));
}

/** Total Incrito Points (IP) across every cohort the user is enrolled in — shown in the topbar. */
export async function getMyTotalPoints(userId: string) {
  const result = await prisma.leaderboardEntry.aggregate({ where: { userId }, _sum: { points: true } });
  return result._sum.points ?? 0;
}

/** Best score (0-100) per assessment, summed — retakes only count once via their best attempt. */
async function computeAssessmentPoints(userId: string, courseId: string) {
  const assessments = await prisma.assessment.findMany({ where: { courseId }, select: { id: true } });
  if (!assessments.length) return 0;

  const attempts = await prisma.assessmentAttempt.findMany({
    where: { userId, assessmentId: { in: assessments.map((a) => a.id) }, status: "GRADED" },
    select: { assessmentId: true, score: true },
  });

  const bestByAssessment = new Map<string, number>();
  for (const attempt of attempts) {
    const prev = bestByAssessment.get(attempt.assessmentId) ?? 0;
    bestByAssessment.set(attempt.assessmentId, Math.max(prev, attempt.score ?? 0));
  }
  return Array.from(bestByAssessment.values()).reduce((sum, score) => sum + score, 0);
}

/** Marks awarded on graded assignment submissions, summed. */
async function computeAssignmentPoints(userId: string, courseId: string) {
  const assignments = await prisma.assignment.findMany({ where: { courseId }, select: { id: true } });
  if (!assignments.length) return 0;

  const submissions = await prisma.submission.findMany({
    where: { userId, assignmentId: { in: assignments.map((a) => a.id) }, status: "GRADED" },
    select: { marksObtained: true },
  });
  return submissions.reduce((sum, s) => sum + (s.marksObtained ?? 0), 0);
}

async function recomputeProgress(userId: string, cohortId: string) {
  const cohort = await prisma.cohort.findUnique({ where: { id: cohortId } });
  if (!cohort) return;

  const enrollment = await prisma.enrollment.findUnique({ where: { userId_cohortId: { userId, cohortId } } });
  const lessonIds = await getCourseLessonIds(cohort.courseId, enrollment?.plan ?? "ICAP");
  const completedCount = lessonIds.length
    ? await prisma.lessonProgress.count({ where: { userId, lessonId: { in: lessonIds }, completed: true } })
    : 0;
  const completionPercentage = lessonIds.length ? Math.round((completedCount / lessonIds.length) * 100) : 0;

  await prisma.progress.upsert({
    where: { userId_cohortId: { userId, cohortId } },
    update: { completionPercentage, lastActivityAt: new Date() },
    create: { userId, cohortId, completionPercentage, lastActivityAt: new Date() },
  });

  // Points: 10 per completed lesson + best quiz/assessment scores + graded assignment marks.
  const [assessmentPoints, assignmentPoints] = await Promise.all([
    computeAssessmentPoints(userId, cohort.courseId),
    computeAssignmentPoints(userId, cohort.courseId),
  ]);
  const points = completedCount * 10 + assessmentPoints + assignmentPoints;

  await prisma.leaderboardEntry.upsert({
    where: { cohortId_userId: { cohortId, userId } },
    update: { points, computedAt: new Date() },
    create: { cohortId, userId, points },
  });
}

/** Recomputes progress/leaderboard for every cohort this user is enrolled in for the given course — used after a quiz attempt or assignment grade lands, neither of which is cohort-scoped on its own. */
export async function recomputeProgressForCourse(userId: string, courseId: string) {
  const enrollments = await prisma.enrollment.findMany({ where: { userId, cohort: { courseId } } });
  await Promise.all(enrollments.map((e) => recomputeProgress(userId, e.cohortId)));
}

export async function markLessonComplete(userId: string, lessonId: string) {
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, include: { module: true } });
  if (!lesson) {
    throw new AppError("Lesson not found", 404);
  }

  const enrollment = await prisma.enrollment.findFirst({
    where: { userId, cohort: { courseId: lesson.module.courseId } },
  });
  const userPlan = enrollment?.plan ?? "ICAP";
  const isLockedByPlan = (planAccess: string) => planAccess !== "BOTH" && planAccess !== userPlan;
  if (isLockedByPlan(lesson.module.planAccess) || isLockedByPlan(lesson.planAccess)) {
    throw new AppError("This lesson is part of the Intensive Pro plan", 403);
  }

  await prisma.lessonProgress.upsert({
    where: { userId_lessonId: { userId, lessonId } },
    update: { completed: true, completedAt: new Date() },
    create: { userId, lessonId, completed: true, completedAt: new Date() },
  });

  const enrollments = await prisma.enrollment.findMany({
    where: { userId, cohort: { courseId: lesson.module.courseId } },
  });
  await Promise.all(enrollments.map((e) => recomputeProgress(userId, e.cohortId)));

  return { completed: true };
}

export async function getMyCourses(userId: string) {
  const enrollments = await prisma.enrollment.findMany({
    where: { userId },
    include: {
      cohort: { include: { course: { include: { modules: { include: { lessons: true } } } } } },
    },
  });

  const results = await Promise.all(
    enrollments.map(async (enrollment) => {
      const plan = enrollment.plan;
      const isAccessible = (planAccess: string) => planAccess === "BOTH" || planAccess === plan;
      const lessons = enrollment.cohort.course.modules
        .filter((m) => isAccessible(m.planAccess))
        .flatMap((m) => m.lessons.filter((l) => isAccessible(l.planAccess)))
        .sort((a, b) => a.order - b.order);
      const lessonIds = lessons.map((l) => l.id);
      const completedIds = lessonIds.length
        ? await prisma.lessonProgress
            .findMany({ where: { userId, lessonId: { in: lessonIds }, completed: true }, select: { lessonId: true } })
            .then((rows) => new Set(rows.map((r) => r.lessonId)))
        : new Set<string>();

      const nextLesson = lessons.find((l) => !completedIds.has(l.id)) ?? lessons[lessons.length - 1] ?? null;
      const percent = lessonIds.length ? Math.round((completedIds.size / lessonIds.length) * 100) : 0;

      return {
        enrollmentId: enrollment.id,
        cohortId: enrollment.cohortId,
        cohortName: enrollment.cohort.name,
        courseId: enrollment.cohort.course.id,
        courseSlug: enrollment.cohort.course.slug,
        courseTitle: enrollment.cohort.course.title,
        thumbnailUrl: enrollment.cohort.course.thumbnailUrl,
        progressPercent: percent,
        totalLessons: lessonIds.length,
        completedLessons: completedIds.size,
        nextLessonId: nextLesson?.id ?? null,
        nextLessonTitle: nextLesson?.title ?? null,
        status: enrollment.status,
        isComplete: lessonIds.length > 0 && completedIds.size === lessonIds.length,
      };
    })
  );

  return results;
}

export async function getRecentActivity(userId: string, courseId: string) {
  const lessonIds = await getCourseLessonIds(courseId);

  const completions = lessonIds.length
    ? await prisma.lessonProgress.findMany({
        where: { userId, lessonId: { in: lessonIds }, completed: true },
        include: { lesson: { select: { title: true } } },
        orderBy: { completedAt: "desc" },
        take: 5,
      })
    : [];

  const attempts = await prisma.assessmentAttempt.findMany({
    where: { userId, status: "GRADED", assessment: { courseId } },
    include: { assessment: { select: { title: true, kind: true } } },
    orderBy: { submittedAt: "desc" },
    take: 5,
  });

  const events = [
    ...completions.map((c) => ({
      type: "lesson_completed" as const,
      label: `Completed lesson: ${c.lesson.title}`,
      at: c.completedAt ?? c.createdAt,
    })),
    ...attempts.map((a) => ({
      type: "assessment_attempted" as const,
      label: `${a.assessment.kind === "QUIZ" ? "Attempted quiz" : "Attempted assessment"}: ${a.assessment.title} (${a.score}%)`,
      at: a.submittedAt!,
    })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime());

  return events.slice(0, 5);
}

const STAFF_ROLES = ["Admin", "Mentor", "Cohort Manager"];

export async function getCourseRoadmapForUser(userId: string, courseSlug: string, roleName?: string) {
  const course = await prisma.course.findUnique({
    where: { slug: courseSlug },
    include: {
      mentor: { select: { id: true, firstName: true, lastName: true } },
      modules: {
        orderBy: { order: "asc" },
        include: {
          lessons: {
            orderBy: { order: "asc" },
            include: {
              liveClass: { include: { mentor: { select: { id: true, firstName: true, lastName: true } } } },
              resources: true,
            },
          },
        },
      },
    },
  });
  if (!course) {
    throw new AppError("Course not found", 404);
  }

  const enrollment = await prisma.enrollment.findFirst({
    where: { userId, cohort: { courseId: course.id } },
    include: { cohort: true },
  });

  /**
   * Staff roles aren't students and rarely have a real Enrollment row, but they still need to open
   * a course's tabs (Overview/Roadmap/Discussion/Leaderboard/Certificate) — e.g. to participate in
   * a cohort's discussion. Fall back to a cohort they're actually attached to as viewing context,
   * with 0% completion (honest — they haven't done any lessons) rather than blocking access
   * outright. Mentor/Cohort Manager fall back to a cohort they actually mentor/manage for this
   * specific course (never just "any cohort," unlike Admin, who isn't tied to one) — without this,
   * a Mentor/Cohort Manager with no Enrollment row hit a 403 on every course tab, including
   * Discussion, even when they were genuinely assigned to that course's cohort.
   */
  let cohort: { id: string; name: string };
  let enrolledAt: Date;
  if (enrollment) {
    cohort = { id: enrollment.cohort.id, name: enrollment.cohort.name };
    enrolledAt = enrollment.enrolledAt;
  } else if (roleName === "Mentor") {
    const fallbackCohort = await prisma.cohort.findFirst({
      where: { courseId: course.id, mentors: { some: { userId } } },
      orderBy: { createdAt: "desc" },
    });
    if (!fallbackCohort) {
      throw new AppError("You are not assigned to any cohort for this course", 403);
    }
    cohort = { id: fallbackCohort.id, name: fallbackCohort.name };
    enrolledAt = course.createdAt;
  } else if (roleName === "Cohort Manager") {
    const fallbackCohort = await prisma.cohort.findFirst({
      where: { courseId: course.id, managers: { some: { userId } } },
      orderBy: { createdAt: "desc" },
    });
    if (!fallbackCohort) {
      throw new AppError("You are not assigned to any cohort for this course", 403);
    }
    cohort = { id: fallbackCohort.id, name: fallbackCohort.name };
    enrolledAt = course.createdAt;
  } else if (roleName === "Admin") {
    const fallbackCohort = await prisma.cohort.findFirst({
      where: { courseId: course.id },
      orderBy: { createdAt: "desc" },
    });
    if (!fallbackCohort) {
      throw new AppError("This course has no cohorts yet", 404);
    }
    cohort = { id: fallbackCohort.id, name: fallbackCohort.name };
    enrolledAt = course.createdAt;
  } else {
    throw new AppError("You are not enrolled in this course", 403);
  }

  const isStaff = STAFF_ROLES.includes(roleName ?? "");
  if (enrollment && !isStaff && enrollment.lmsAccessExpiresAt && enrollment.lmsAccessExpiresAt < new Date()) {
    throw new AppError("Your LMS access for this course has expired", 403);
  }
  const userPlan = enrollment?.plan ?? "ICAP";
  const isLockedFor = (planAccess: string) => !isStaff && planAccess !== "BOTH" && planAccess !== userPlan;

  const allLessonIds = course.modules.flatMap((m) => m.lessons.map((l) => l.id));
  const completedRows = allLessonIds.length
    ? await prisma.lessonProgress.findMany({
        where: { userId, lessonId: { in: allLessonIds }, completed: true },
        select: { lessonId: true },
      })
    : [];
  const completedSet = new Set(completedRows.map((r) => r.lessonId));

  const recordingAccessExpired = Boolean(
    enrollment && !isStaff && enrollment.recordingAccessExpiresAt && enrollment.recordingAccessExpiresAt < new Date()
  );

  const modules = course.modules.map((module) => {
    const moduleLockedByPlan = isLockedFor(module.planAccess);
    const lessons = module.lessons.map((lesson) => {
      const lessonLockedByPlan = moduleLockedByPlan || isLockedFor(lesson.planAccess);
      return {
        ...lesson,
        // Content is stripped server-side for plan-locked lessons — a locked lesson is never
        // viewable by navigating directly to its URL, not just hidden behind a disabled button.
        contentUrl: lessonLockedByPlan ? null : lesson.contentUrl,
        content: lessonLockedByPlan ? null : lesson.content,
        completed: completedSet.has(lesson.id),
        lockedByPlan: lessonLockedByPlan,
        liveClass: lesson.liveClass
          ? (() => {
              // The raw S3 key is never sent to the frontend (`recordingUrl` is dropped entirely)
              // — only whether a recording exists and is currently watchable; the actual playback
              // URL is fetched on-demand, short-lived, from the dedicated signed-URL endpoint
              // (which re-checks this exact same access logic server-side, never trusting this
              // flag alone).
              const { recordingUrl, ...rest } = lesson.liveClass;
              return {
                ...rest,
                isLiveNow: isLiveNow(lesson.liveClass),
                hasRecording: Boolean(recordingUrl) && !lessonLockedByPlan && !recordingAccessExpired,
                joinUrl: lessonLockedByPlan ? null : lesson.liveClass.joinUrl,
              };
            })()
          : null,
      };
    });
    const completedCount = lessons.filter((l) => l.completed).length;
    const moduleStatus = completedCount === lessons.length && lessons.length > 0 ? "completed" : completedCount > 0 ? "in-progress" : "locked";
    return { ...module, lessons, completedCount, status: moduleStatus, lockedByPlan: moduleLockedByPlan };
  });

  // Completion is scoped to what this plan can actually access — an ICAP student isn't penalized
  // for Intensive-Pro-only lessons they were never going to see, and 100% (and certificate
  // eligibility, which reads this same percentage) is reachable on their own plan.
  const accessibleModules = isStaff ? course.modules : course.modules.filter((m) => !isLockedFor(m.planAccess));
  const accessibleLessons = accessibleModules.flatMap((m) =>
    isStaff ? m.lessons : m.lessons.filter((l) => !isLockedFor(l.planAccess))
  );
  const totalLessons = accessibleLessons.length;
  const completedLessons = accessibleLessons.filter((l) => completedSet.has(l.id)).length;
  const totalDurationMinutes = accessibleLessons.reduce((sum, l) => sum + (l.durationMinutes ?? 0), 0);

  return {
    course: {
      id: course.id,
      slug: course.slug,
      title: course.title,
      description: course.description,
      unlockMode: course.unlockMode,
      mentor: course.mentor,
    },
    cohort,
    enrolledAt,
    plan: userPlan,
    totalLessons,
    completedLessons,
    totalDurationMinutes,
    completionPercentage: totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0,
    modules,
  };
}
