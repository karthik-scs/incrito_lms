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

  // ── Live class events ────────────────────────────────────────────────────────
  const liveClassEvents: object[] = [];

  if (cohortIds.length > 0) {
    const cohorts = await prisma.cohort.findMany({
      where: { id: { in: cohortIds }, ...(filter.courseId ? { courseId: filter.courseId } : {}) },
      select: { id: true, name: true, courseId: true, course: { select: { id: true, title: true, slug: true } } },
    });
    const cohortById = new Map(cohorts.map((c) => [c.id, c]));

    if (cohortIds.length > 0) {
      const lessons = await prisma.lesson.findMany({
        where: {
          type: "LIVE",
          module: { cohortId: { in: cohortIds } },
          liveClass: {
            status: { notIn: ["CANCELLED"] },
            ...(filter.mentorId ? { mentorId: filter.mentorId } : {}),
            ...(filter.from ? { startTime: { gte: filter.from } } : {}),
            ...(filter.to ? { startTime: { lte: filter.to } } : {}),
          },
        },
        include: {
          liveClass: { include: { mentor: { select: { id: true, firstName: true, lastName: true } } } },
          module: { select: { cohortId: true } },
        },
      });

      for (const lesson of lessons) {
        if (!lesson.liveClass) continue;
        const liveClass = lesson.liveClass;
        const cohort = cohortById.get(lesson.module.cohortId);
        const effectiveStatus =
          liveClass.status === "SCHEDULED" && new Date() > new Date(liveClass.endTime)
            ? "COMPLETED"
            : liveClass.status;
        liveClassEvents.push({
          id: lesson.id,
          type: "LIVE_CLASS" as const,
          title: lesson.title,
          startTime: liveClass.startTime,
          endTime: liveClass.endTime,
          status: effectiveStatus,
          joinUrl: liveClass.joinUrl,
          isLiveNow: isLiveNow(liveClass),
          cohort: cohort ? { id: cohort.id, name: cohort.name } : null,
          course: cohort ? cohort.course : null,
          mentor: liveClass.mentor,
        });
      }
    }
  }

  // ── 1:1 Booking events ───────────────────────────────────────────────────────
  const bookingWhere = {
    OR: [{ mentorId: userId }, { studentId: userId }],
    status: { in: ["PENDING", "CONFIRMED"] as ("PENDING" | "CONFIRMED")[] },
    ...(filter.from ? { scheduledAt: { gte: filter.from } } : {}),
    ...(filter.to ? { scheduledAt: { lte: filter.to } } : {}),
  };

  const bookings = await prisma.mentorBooking.findMany({
    where: bookingWhere,
    include: {
      mentor: { select: { id: true, firstName: true, lastName: true } },
      student: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { scheduledAt: "asc" },
  });

  const bookingEvents = bookings.map((b) => ({
    id: b.id,
    type: "BOOKING" as const,
    title: b.topic ?? "1:1 Session",
    startTime: b.scheduledAt,
    endTime: new Date(b.scheduledAt.getTime() + b.durationMinutes * 60 * 1000),
    status: b.status,
    meetingUrl: b.meetingUrl,
    mentor: b.mentor,
    student: b.student,
  }));

  return [...liveClassEvents, ...bookingEvents].sort((a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
}
