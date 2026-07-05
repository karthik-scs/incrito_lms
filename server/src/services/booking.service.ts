import { prisma } from "../lib/prisma";
import { AppError } from "../utils/AppError";
import { notifyUser } from "./notification.service";

function dmKey(a: string, b: string) {
  return [a, b].sort().join("_");
}

async function postBookingMessage(userA: string, userB: string, content: string, attachmentType: string, attachmentUrl: string) {
  const key = dmKey(userA, userB);
  const conversation = await prisma.conversation.findUnique({ where: { dmKey: key } });
  if (!conversation) return; // no active chat — skip silently
  await prisma.chatMessage.create({
    data: { conversationId: conversation.id, senderId: userA, content, attachmentType, attachmentUrl },
  });
}

// ── Availability ──────────────────────────────────────────────────────────────

export async function listAvailability(mentorId: string) {
  return prisma.mentorAvailability.findMany({
    where: { mentorId },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });
}

export async function setAvailability(mentorId: string, slots: { dayOfWeek: number; startTime: string; endTime: string }[]) {
  // Replace all slots atomically
  await prisma.$transaction([
    prisma.mentorAvailability.deleteMany({ where: { mentorId } }),
    prisma.mentorAvailability.createMany({
      data: slots.map((s) => ({ mentorId, ...s })),
    }),
  ]);
  return listAvailability(mentorId);
}

// ── Booking ────────────────────────────────────────────────────────────────────

export async function listBookingsForMentor(mentorId: string) {
  return prisma.mentorBooking.findMany({
    where: { mentorId },
    include: { student: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } }, cohort: { select: { id: true, name: true } }, rating: true },
    orderBy: { scheduledAt: "desc" },
  });
}

export async function listBookingsForStudent(studentId: string) {
  return prisma.mentorBooking.findMany({
    where: { studentId },
    include: { mentor: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } }, cohort: { select: { id: true, name: true } }, rating: true },
    orderBy: { scheduledAt: "desc" },
  });
}

export async function createBooking(studentId: string, data: {
  mentorId: string;
  cohortId?: string;
  scheduledAt: Date;
  durationMinutes?: number;
  topic?: string;
  notes?: string;
}) {
  // Verify student and mentor share a cohort if cohortId provided
  if (data.cohortId) {
    const enrolled = await prisma.enrollment.findFirst({ where: { userId: studentId, cohortId: data.cohortId } });
    if (!enrolled) throw new AppError("You are not enrolled in this cohort", 403);
  }

  const booking = await prisma.mentorBooking.create({
    data: {
      studentId,
      mentorId: data.mentorId,
      cohortId: data.cohortId ?? null,
      scheduledAt: data.scheduledAt,
      durationMinutes: data.durationMinutes ?? 30,
      topic: data.topic,
      notes: data.notes,
      status: "PENDING",
    },
    include: { mentor: { select: { firstName: true, lastName: true } } },
  });

  await notifyUser(data.mentorId, "ANNOUNCEMENT", "New 1:1 booking request", "A student has requested a 1:1 session with you.", { action: "view_booking", bookingId: booking.id });

  const when = new Date(data.scheduledAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  const description = data.topic ? `${data.topic} — ${when}` : when;
  await postBookingMessage(studentId, data.mentorId, `📅 1:1 session requested: ${description}`, "BOOKING_REQUEST", booking.id);

  return booking;
}

export async function confirmBooking(bookingId: string, mentorId: string, meetingUrl?: string) {
  const booking = await prisma.mentorBooking.findUnique({ where: { id: bookingId } });
  if (!booking || booking.mentorId !== mentorId) throw new AppError("Booking not found", 404);
  if (booking.status !== "PENDING") throw new AppError("Only pending bookings can be confirmed", 400);

  const updated = await prisma.mentorBooking.update({
    where: { id: bookingId },
    data: { status: "CONFIRMED", meetingUrl: meetingUrl ?? null },
  });

  await notifyUser(booking.studentId, "ANNOUNCEMENT", "Session confirmed", "Your 1:1 session with your mentor has been confirmed.", { action: "view_booking", bookingId: booking.id });

  const when = booking.scheduledAt.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  const urlNote = meetingUrl ? ` · Join: ${meetingUrl}` : "";
  await postBookingMessage(mentorId, booking.studentId, `✅ 1:1 session confirmed: ${when}${urlNote}`, "BOOKING_CONFIRMED", bookingId);

  return updated;
}

export async function cancelBooking(bookingId: string, userId: string, cancelReason?: string) {
  const booking = await prisma.mentorBooking.findUnique({ where: { id: bookingId } });
  if (!booking) throw new AppError("Booking not found", 404);
  if (booking.mentorId !== userId && booking.studentId !== userId) throw new AppError("Not your booking", 403);
  if (booking.status === "CANCELLED" || booking.status === "COMPLETED") {
    throw new AppError("Booking cannot be cancelled in its current state", 400);
  }

  const updated = await prisma.mentorBooking.update({
    where: { id: bookingId },
    data: { status: "CANCELLED", cancelReason: cancelReason ?? null },
  });

  const notifyId = booking.mentorId === userId ? booking.studentId : booking.mentorId;
  await notifyUser(notifyId, "ANNOUNCEMENT", "Session cancelled", "A 1:1 session booking has been cancelled.", { action: "view_booking", bookingId: booking.id });

  return updated;
}

export async function completeBooking(bookingId: string, mentorId: string) {
  const booking = await prisma.mentorBooking.findUnique({ where: { id: bookingId } });
  if (!booking || booking.mentorId !== mentorId) throw new AppError("Booking not found", 404);
  if (booking.status !== "CONFIRMED") throw new AppError("Only confirmed bookings can be marked complete", 400);

  const updated = await prisma.mentorBooking.update({
    where: { id: bookingId },
    data: { status: "COMPLETED" },
  });

  await notifyUser(booking.studentId, "ANNOUNCEMENT", "Session complete", "Your 1:1 session is done — tap to leave a rating for your mentor.", { action: "rate_booking", bookingId: booking.id });

  return updated;
}
