import { prisma } from "../lib/prisma";
import { isLiveNow } from "./lesson.service";

export async function getMyCalendarEvents(
  userId: string,
  filter: { from?: Date; to?: Date; cohortId?: string; courseId?: string; mentorId?: string }
) {
  const enrollments = await prisma.enrollment.findMany({ where: { userId }, select: { cohortId: true } });
  const mentorships = await prisma.cohortMentor.findMany({ where: { userId }, select: { cohortId: true } });
  const managing = await prisma.cohortManagerAssignment.findMany({ where: { userId }, select: { cohortId: true } });

  let cohortIds = Array.from(
    new Set([...enrollments.map((e) => e.cohortId), ...mentorships.map((m) => m.cohortId), ...managing.map((m) => m.cohortId)])
  );
  if (filter.cohortId) cohortIds = cohortIds.filter((id) => id === filter.cohortId);

  if (cohortIds.length === 0) return [];

  const cohorts = await prisma.cohort.findMany({
    where: { id: { in: cohortIds }, ...(filter.courseId ? { courseId: filter.courseId } : {}) },
    select: { id: true, name: true, courseId: true, course: { select: { id: true, title: true, slug: true } } },
  });
  const cohortById = new Map(cohorts.map((c) => [c.id, c]));
  const courseIds = cohorts.map((c) => c.courseId);

  if (courseIds.length === 0) return [];

  const lessons = await prisma.lesson.findMany({
    where: {
      type: "LIVE",
      module: { courseId: { in: courseIds } },
      liveClass: {
        status: { notIn: ["CANCELLED", "COMPLETED"] },
        ...(filter.mentorId ? { mentorId: filter.mentorId } : {}),
        ...(filter.from ? { startTime: { gte: filter.from } } : {}),
        ...(filter.to ? { startTime: { lte: filter.to } } : {}),
      },
    },
    include: {
      liveClass: { include: { mentor: { select: { id: true, firstName: true, lastName: true } } } },
      module: { select: { courseId: true } },
    },
  });

  return lessons
    .filter((lesson) => lesson.liveClass)
    .map((lesson) => {
      const liveClass = lesson.liveClass!;
      const cohort = [...cohortById.values()].find((c) => c.courseId === lesson.module.courseId);
      return {
        id: lesson.id,
        type: "LIVE_CLASS" as const,
        title: lesson.title,
        startTime: liveClass.startTime,
        endTime: liveClass.endTime,
        status: liveClass.status,
        joinUrl: liveClass.joinUrl,
        isLiveNow: isLiveNow(liveClass),
        cohort: cohort ? { id: cohort.id, name: cohort.name } : null,
        course: cohort ? cohort.course : null,
        mentor: liveClass.mentor,
      };
    })
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
}
