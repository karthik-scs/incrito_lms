import crypto from "node:crypto";
import { prisma } from "../lib/prisma";
import { logger } from "../lib/logger";
import { uploadObject, buildS3Key } from "../lib/s3";
import { getAccessTokenForAccount } from "../lib/zoom";
import { notifyLiveClassTransition } from "./lesson.service";
import { notifyCohort } from "./notification.service";

export function computeSignature(secretToken: string, timestamp: string, rawBody: string) {
  const message = `v0:${timestamp}:${rawBody}`;
  return `v0=${crypto.createHmac("sha256", secretToken).update(message).digest("hex")}`;
}

/** Zoom's one-time "Validate" button in the Event Subscriptions UI — no signature to check yet. */
export function handleUrlValidation(secretToken: string, plainToken: string) {
  const encryptedToken = crypto.createHmac("sha256", secretToken).update(plainToken).digest("hex");
  return { plainToken, encryptedToken };
}

type ZoomEventPayload = {
  event: string;
  payload: {
    account_id?: string;
    plainToken?: string;
    object?: {
      id?: number | string;
      recording_files?: { file_type: string; download_url: string }[];
    };
  };
};

async function findLiveClassByMeetingId(zoomMeetingId: string) {
  return prisma.liveClass.findFirst({ where: { zoomMeetingId: String(zoomMeetingId) }, include: { lesson: true } });
}

async function handleMeetingStarted(meetingId: string) {
  const liveClass = await findLiveClassByMeetingId(meetingId);
  if (!liveClass || !liveClass.lesson) return;
  if (liveClass.status === "LIVE") return;

  const before = { status: liveClass.status };
  const updated = await prisma.liveClass.update({
    where: { id: liveClass.id },
    data: { status: "LIVE", startedAt: liveClass.startedAt ?? new Date() },
  });

  await notifyLiveClassTransition(liveClass.lesson.id, before, updated);
}

async function handleMeetingEnded(meetingId: string) {
  const liveClass = await findLiveClassByMeetingId(meetingId);
  if (!liveClass || !liveClass.lesson) return;
  if (liveClass.status === "COMPLETED" || liveClass.status === "CANCELLED") return;

  const before = { status: liveClass.status };
  const updated = await prisma.liveClass.update({
    where: { id: liveClass.id },
    data: { status: "COMPLETED", endedAt: liveClass.endedAt ?? new Date() },
  });

  // "No need of end" — the host never has to manually mark a session complete; Zoom's own
  // meeting.ended event is the source of truth for "this live class is over."
  await notifyLiveClassTransition(liveClass.lesson.id, before, updated);
}

/** Returns the S3 key (never a literal URL) — playback always goes through the protected signed-URL endpoint. */
async function downloadAndStoreRecording(liveClassId: string, accountId: string, downloadUrl: string) {
  const accessToken = await getAccessTokenForAccount(accountId);
  const response = await fetch(downloadUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!response.ok) {
    throw new Error(`Failed to download Zoom recording: ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const key = buildS3Key("recordings", liveClassId, ".mp4");
  await uploadObject(key, buffer, "video/mp4");
  return key;
}

async function handleRecordingCompleted(meetingId: string, recordingFiles: { file_type: string; download_url: string }[]) {
  const liveClass = await findLiveClassByMeetingId(meetingId);
  if (!liveClass || !liveClass.lesson || !liveClass.zoomAccountId) return;

  const mp4 = recordingFiles.find((f) => f.file_type === "MP4");
  if (!mp4) return;

  const recordingUrl = await downloadAndStoreRecording(liveClass.id, liveClass.zoomAccountId, mp4.download_url);

  await prisma.liveClass.update({
    where: { id: liveClass.id },
    data: {
      recordingUrl,
      status: liveClass.status === "CANCELLED" ? liveClass.status : "COMPLETED",
      endedAt: liveClass.endedAt ?? new Date(),
    },
  });

  const module = await prisma.module.findUnique({
    where: { id: liveClass.lesson.moduleId },
    include: { course: { select: { id: true, slug: true } } },
  });
  if (!module) return;
  const cohorts = await prisma.cohort.findMany({ where: { courseId: module.courseId }, select: { id: true } });

  await Promise.all(
    cohorts.map((c) =>
      notifyCohort(
        c.id,
        "CLASS_REMINDER",
        "Recording available",
        `The recording for "${liveClass.title}" is now available to watch.`,
        { lessonId: liveClass.lesson!.id, liveClassId: liveClass.id, courseSlug: module.course.slug, action: "watch" }
      ).catch(() => null)
    )
  );
}

/** Downloading + saving a recording can take a while — caller fires this without awaiting it. */
export function processRecordingCompletedInBackground(meetingId: string, recordingFiles: { file_type: string; download_url: string }[]) {
  handleRecordingCompleted(meetingId, recordingFiles).catch((err) =>
    logger.error("Failed to process Zoom recording.completed webhook", { message: err instanceof Error ? err.message : String(err) })
  );
}

export async function processZoomEvent(body: ZoomEventPayload) {
  const meetingId = body.payload.object?.id;
  if (!meetingId) return;

  switch (body.event) {
    case "meeting.started":
      await handleMeetingStarted(String(meetingId));
      break;
    case "meeting.ended":
      await handleMeetingEnded(String(meetingId));
      break;
    case "recording.completed":
      processRecordingCompletedInBackground(String(meetingId), body.payload.object?.recording_files ?? []);
      break;
    default:
      break;
  }
}
