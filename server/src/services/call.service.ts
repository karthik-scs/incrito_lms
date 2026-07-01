import { prisma } from "../lib/prisma";
import { AppError } from "../utils/AppError";

type IceCandidate = { from: string; candidate: object };

export async function initiateCall(callerId: string, calleeId: string, callType: "AUDIO" | "VIDEO", offerSdp: string) {
  if (callerId === calleeId) throw new AppError("Cannot call yourself", 400);

  // Expire any existing ringing/active call between these two
  await prisma.callSession.updateMany({
    where: {
      status: { in: ["RINGING", "ACTIVE"] },
      OR: [
        { callerId, calleeId },
        { callerId: calleeId, calleeId: callerId },
      ],
    },
    data: { status: "ENDED", endedAt: new Date() },
  });

  return prisma.callSession.create({
    data: { callerId, calleeId, callType, offerSdp, status: "RINGING" },
    include: {
      caller: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      callee: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
    },
  });
}

export async function pollIncomingCall(calleeId: string) {
  // Return the most recent ringing call for this user (max 30s old to avoid ghost calls)
  const thirtySecondsAgo = new Date(Date.now() - 30_000);
  return prisma.callSession.findFirst({
    where: { calleeId, status: "RINGING", createdAt: { gte: thirtySecondsAgo } },
    include: { caller: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getCallSession(sessionId: string, userId: string) {
  const session = await prisma.callSession.findUnique({
    where: { id: sessionId },
    include: {
      caller: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      callee: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
    },
  });
  if (!session) throw new AppError("Call session not found", 404);
  if (session.callerId !== userId && session.calleeId !== userId) throw new AppError("Not your call", 403);
  return session;
}

export async function acceptCall(sessionId: string, calleeId: string, answerSdp: string) {
  const session = await prisma.callSession.findUnique({ where: { id: sessionId } });
  if (!session || session.calleeId !== calleeId) throw new AppError("Call not found", 404);
  if (session.status !== "RINGING") throw new AppError("Call is no longer ringing", 400);

  return prisma.callSession.update({
    where: { id: sessionId },
    data: { answerSdp, status: "ACTIVE", startedAt: new Date() },
  });
}

export async function declineCall(sessionId: string, calleeId: string) {
  const session = await prisma.callSession.findUnique({ where: { id: sessionId } });
  if (!session || session.calleeId !== calleeId) throw new AppError("Call not found", 404);
  if (session.status !== "RINGING") throw new AppError("Call is no longer ringing", 400);

  return prisma.callSession.update({
    where: { id: sessionId },
    data: { status: "DECLINED", endedAt: new Date() },
  });
}

export async function endCall(sessionId: string, userId: string) {
  const session = await prisma.callSession.findUnique({ where: { id: sessionId } });
  if (!session) throw new AppError("Call not found", 404);
  if (session.callerId !== userId && session.calleeId !== userId) throw new AppError("Not your call", 403);

  // Mark MISSED if callee never answered
  const finalStatus = session.status === "RINGING" ? "MISSED" : "ENDED";

  return prisma.callSession.update({
    where: { id: sessionId },
    data: { status: finalStatus, endedAt: new Date() },
  });
}

export async function addIceCandidates(sessionId: string, userId: string, candidates: object[]) {
  const session = await prisma.callSession.findUnique({ where: { id: sessionId } });
  if (!session) throw new AppError("Call not found", 404);
  if (session.callerId !== userId && session.calleeId !== userId) throw new AppError("Not your call", 403);

  const existing = (session.iceCandidates as IceCandidate[]) ?? [];
  const appended: IceCandidate[] = [...existing, ...candidates.map((c) => ({ from: userId, candidate: c }))];

  return prisma.callSession.update({
    where: { id: sessionId },
    data: { iceCandidates: appended },
    select: { iceCandidates: true },
  });
}
