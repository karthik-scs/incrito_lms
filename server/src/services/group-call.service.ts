import { prisma } from "../lib/prisma";
import { AppError } from "../utils/AppError";
import { notifyUser } from "./notification.service";
import { createZohoMeeting } from "../lib/zoho";

const SLOT_INCLUDE = {
  mentor: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
  requests: {
    include: { student: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
    orderBy: { createdAt: "asc" as const },
  },
} as const;

// ── Mentor: manage slots ──────────────────────────────────────────────────────

export async function listMentorSlots(mentorId: string) {
  return prisma.groupCallSlot.findMany({
    where: { mentorId },
    include: SLOT_INCLUDE,
    orderBy: { scheduledAt: "asc" },
  });
}

export async function createSlot(mentorId: string, data: {
  scheduledAt: Date;
  durationMinutes?: number;
  maxMembers?: number;
  topic?: string;
  meetingUrl?: string;
}) {
  return prisma.groupCallSlot.create({
    data: {
      mentorId,
      scheduledAt: data.scheduledAt,
      durationMinutes: data.durationMinutes ?? 60,
      maxMembers: data.maxMembers ?? 5,
      topic: data.topic ?? null,
      meetingUrl: data.meetingUrl ?? null,
    },
    include: SLOT_INCLUDE,
  });
}

export async function updateSlot(slotId: string, mentorId: string, data: {
  meetingUrl?: string;
  topic?: string;
  status?: "OPEN" | "CANCELLED" | "COMPLETED";
}) {
  const slot = await prisma.groupCallSlot.findUnique({ where: { id: slotId } });
  if (!slot || slot.mentorId !== mentorId) throw new AppError("Slot not found", 404);

  return prisma.groupCallSlot.update({
    where: { id: slotId },
    data,
    include: SLOT_INCLUDE,
  });
}

export async function cancelSlot(slotId: string, mentorId: string) {
  const slot = await prisma.groupCallSlot.findUnique({
    where: { id: slotId },
    include: { requests: { where: { status: "CONFIRMED" }, select: { studentId: true } } },
  });
  if (!slot || slot.mentorId !== mentorId) throw new AppError("Slot not found", 404);

  const updated = await prisma.groupCallSlot.update({
    where: { id: slotId },
    data: { status: "CANCELLED" },
    include: SLOT_INCLUDE,
  });

  for (const r of slot.requests) {
    await notifyUser(r.studentId, "ANNOUNCEMENT", "Group session cancelled", "A group session you joined has been cancelled by the mentor.");
  }
  return updated;
}

// ── Mentor: manage requests ───────────────────────────────────────────────────

export async function confirmRequest(slotId: string, requestId: string, mentorId: string) {
  const slot = await prisma.groupCallSlot.findUnique({
    where: { id: slotId },
    include: { requests: { where: { status: "CONFIRMED" } } },
  });
  if (!slot || slot.mentorId !== mentorId) throw new AppError("Slot not found", 404);
  if (slot.requests.length >= slot.maxMembers) throw new AppError("Session is already full", 400);

  const req = await prisma.groupCallRequest.update({
    where: { id: requestId },
    data: { status: "CONFIRMED" },
    select: { studentId: true, slot: { select: { scheduledAt: true, topic: true, meetingUrl: true } } },
  });

  const confirmedCount = slot.requests.length + 1;
  if (confirmedCount >= slot.maxMembers) {
    // Auto-schedule a Zoho meeting when the slot becomes full
    let meetingUrl: string | null = null;
    if (!slot.meetingUrl) {
      const zohoAccount = await prisma.userLiveAccount.findUnique({
        where: { userId_provider: { userId: slot.mentorId, provider: "ZOHO" } },
      });
      if (zohoAccount?.isActive) {
        const endTime = new Date(slot.scheduledAt.getTime() + slot.durationMinutes * 60 * 1000);
        const meeting = await createZohoMeeting(zohoAccount.id, {
          topic: slot.topic ?? "Group Session",
          startTime: slot.scheduledAt,
          endTime,
        }).catch(() => null);
        if (meeting) meetingUrl = meeting.joinUrl;
      }
    }
    await prisma.groupCallSlot.update({
      where: { id: slotId },
      data: { status: "FULL", ...(meetingUrl ? { meetingUrl } : {}) },
    });
  }

  const when = req.slot.scheduledAt.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  await notifyUser(req.studentId, "ANNOUNCEMENT", "Group session confirmed", `Your request to join the group session on ${when} has been confirmed.`);

  return req;
}

export async function declineRequest(slotId: string, requestId: string, mentorId: string) {
  const slot = await prisma.groupCallSlot.findUnique({ where: { id: slotId } });
  if (!slot || slot.mentorId !== mentorId) throw new AppError("Slot not found", 404);

  const req = await prisma.groupCallRequest.update({
    where: { id: requestId },
    data: { status: "CANCELLED" },
    select: { studentId: true },
  });

  await notifyUser(req.studentId, "ANNOUNCEMENT", "Group session request declined", "Your request to join a group session was not accepted.");
  return req;
}

// ── Student: browse and request ───────────────────────────────────────────────

export async function listAvailableSlots(studentId: string) {
  const mentorships = await prisma.cohortMentor.findMany({
    where: { cohort: { enrollments: { some: { userId: studentId } } } },
    select: { userId: true },
  });
  const mentorIds = [...new Set(mentorships.map((m) => m.userId))];

  return prisma.groupCallSlot.findMany({
    where: {
      mentorId: { in: mentorIds },
      status: { in: ["OPEN", "FULL"] },
      scheduledAt: { gte: new Date() },
    },
    include: {
      ...SLOT_INCLUDE,
      requests: {
        where: { studentId },
        select: { id: true, status: true },
      },
    },
    orderBy: { scheduledAt: "asc" },
  });
}

export async function requestJoin(slotId: string, studentId: string) {
  const slot = await prisma.groupCallSlot.findUnique({ where: { id: slotId } });
  if (!slot) throw new AppError("Session not found", 404);
  if (slot.status === "CANCELLED" || slot.status === "COMPLETED") throw new AppError("This session is no longer available", 400);

  // Verify premium plan in a cohort with this mentor
  const premiumEnrollment = await prisma.enrollment.findFirst({
    where: {
      userId: studentId,
      plan: "INTENSIVE_PRO",
      cohort: { mentors: { some: { userId: slot.mentorId } } },
    },
  });
  if (!premiumEnrollment) throw new AppError("Group sessions require an Intensive Pro plan", 403);

  const existing = await prisma.groupCallRequest.findUnique({
    where: { slotId_studentId: { slotId, studentId } },
  });
  if (existing) {
    if (existing.status === "CANCELLED") {
      return prisma.groupCallRequest.update({ where: { id: existing.id }, data: { status: "PENDING" } });
    }
    throw new AppError("You have already requested this session", 409);
  }

  const request = await prisma.groupCallRequest.create({
    data: { slotId, studentId, status: "PENDING" },
  });

  await notifyUser(slot.mentorId, "ANNOUNCEMENT", "New group session request", "A student has requested to join your group session.");
  return request;
}

export async function cancelStudentRequest(slotId: string, studentId: string) {
  const request = await prisma.groupCallRequest.findUnique({
    where: { slotId_studentId: { slotId, studentId } },
  });
  if (!request || request.studentId !== studentId) throw new AppError("Request not found", 404);
  if (request.status === "CANCELLED") throw new AppError("Already cancelled", 400);

  const updated = await prisma.groupCallRequest.update({
    where: { id: request.id },
    data: { status: "CANCELLED" },
  });

  // If slot was FULL, reopen it
  await prisma.groupCallSlot.updateMany({
    where: { id: slotId, status: "FULL" },
    data: { status: "OPEN" },
  });

  return updated;
}
