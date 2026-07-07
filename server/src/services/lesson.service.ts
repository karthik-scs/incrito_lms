import { prisma } from "../lib/prisma";
import { AppError } from "../utils/AppError";
import { createZohoMeeting } from "../lib/zoho";
import { buildS3Key, getPresignedPutUrl, getPresignedGetUrl, deleteObject, keyFromUrl } from "../lib/s3";
import { notifyCohort } from "./notification.service";

const lessonInclude = {
  liveClass: { include: { mentor: { select: { id: true, firstName: true, lastName: true } } } },
  resources: true,
} as const;

type LiveClassInput = {
  startTime: Date;
  endTime: Date;
  mentorId: string;
  joinUrl?: string;
  userLiveAccountId?: string;
};

type LessonInput = {
  moduleId: string;
  title: string;
  type: "VIDEO" | "TEXT" | "PDF" | "LIVE";
  contentUrl?: string;
  thumbnailUrl?: string;
  content?: string;
  durationMinutes?: number;
  order?: number;
  planAccess?: "ICAP" | "INTENSIVE_PRO" | "BOTH";
  liveClass?: LiveClassInput;
};

/**
 * Returns true if the class is currently joinable.
 * A class is NOT live once its end time has passed, regardless of the stored status —
 * this guards against stale LIVE records that were never manually completed.
 */
export function isLiveNow(liveClass: { startTime: Date; endTime?: Date; status: string }) {
  if (liveClass.status === "CANCELLED" || liveClass.status === "COMPLETED") return false;
  if (liveClass.endTime && new Date() > liveClass.endTime) return false;
  if (liveClass.status === "LIVE") return true;
  return Date.now() >= liveClass.startTime.getTime() - 10 * 60 * 1000;
}

/** Auto-completes SCHEDULED or LIVE classes whose end time has passed (avoids stale DB status). */
function withComputedStatus<T extends { liveClass: { startTime: Date; endTime: Date; status: string } | null }>(lesson: T) {
  if (!lesson.liveClass) return { ...lesson, liveClass: null };
  const lc = lesson.liveClass;
  const pastEnd = new Date() > new Date(lc.endTime);
  const effectiveStatus =
    (lc.status === "SCHEDULED" || lc.status === "LIVE") && pastEnd ? "COMPLETED" : lc.status;
  return {
    ...lesson,
    liveClass: { ...lc, status: effectiveStatus, isLiveNow: isLiveNow({ ...lc, status: effectiveStatus }) },
  };
}

export async function listLessons(moduleId: string) {
  const lessons = await prisma.lesson.findMany({
    where: { moduleId },
    include: lessonInclude,
    orderBy: { order: "asc" },
  });
  return lessons.map(withComputedStatus);
}

async function nextOrder(moduleId: string) {
  const last = await prisma.lesson.findFirst({ where: { moduleId }, orderBy: { order: "desc" } });
  return (last?.order ?? 0) + 1;
}

type ScheduledMeeting = {
  provider: "ZOHO";
  userLiveAccountId: string | null;
  zohoMeetingId: string | null;
  joinUrl: string | null;
  hostStartUrl: string | null;
};

/**
 * Schedules a Zoho meeting for the given live account. If no Zoho account is connected,
 * creates the live class without a meeting URL so the mentor can paste one later.
 */
async function scheduleLiveMeeting(input: LiveClassInput, topic: string): Promise<ScheduledMeeting> {
  if (input.userLiveAccountId) {
    const account = await prisma.userLiveAccount.findUnique({ where: { id: input.userLiveAccountId } });
    if (!account || account.userId !== input.mentorId || !account.isActive) {
      throw new AppError("That connected account doesn't belong to this host or is no longer active", 422);
    }
    const meeting = await createZohoMeeting(account.id, { topic, startTime: input.startTime, endTime: input.endTime });
    return {
      provider: "ZOHO",
      userLiveAccountId: account.id,
      zohoMeetingId: meeting.zohoMeetingId,
      joinUrl: meeting.joinUrl,
      hostStartUrl: meeting.hostStartUrl,
    };
  }

  // No Zoho account — use manually-provided join URL if given, or leave null for later.
  return {
    provider: "ZOHO",
    userLiveAccountId: null,
    zohoMeetingId: null,
    joinUrl: input.joinUrl ?? null,
    hostStartUrl: null,
  };
}

export async function createLesson(data: LessonInput) {
  const module = await prisma.module.findUnique({ where: { id: data.moduleId } });
  if (!module) {
    throw new AppError("Module not found", 404);
  }

  if (data.type === "LIVE" && !data.liveClass) {
    throw new AppError("Live lessons require a schedule (start time, end time, mentor)", 422);
  }

  const order = data.order ?? (await nextOrder(data.moduleId));

  if (data.type === "LIVE" && data.liveClass) {
    const host = await prisma.user.findUnique({ where: { id: data.liveClass.mentorId }, include: { role: true } });
    if (!host) {
      throw new AppError("Host not found", 404);
    }
    if (!["Admin", "Mentor", "Cohort Manager"].includes(host.role.name)) {
      throw new AppError("The host must be an Admin, Mentor, or Cohort Manager", 422);
    }

    // Auto-generate the meeting via Zoho if the host has a connected account; otherwise the
    // session is created without a URL and the mentor can paste one in later.
    const scheduled = await scheduleLiveMeeting(data.liveClass, data.title);

    const liveClass = await prisma.liveClass.create({
      data: {
        title: data.title,
        mentorId: data.liveClass.mentorId,
        startTime: data.liveClass.startTime,
        endTime: data.liveClass.endTime,
        provider: scheduled.provider,
        userLiveAccountId: scheduled.userLiveAccountId,
        zohoMeetingId: scheduled.zohoMeetingId,
        joinUrl: scheduled.joinUrl,
        hostStartUrl: scheduled.hostStartUrl,
      },
    });

    const lesson = await prisma.lesson.create({
      data: {
        moduleId: data.moduleId,
        title: data.title,
        type: data.type,
        order,
        planAccess: data.planAccess ?? "BOTH",
        liveClassId: liveClass.id,
      },
      include: lessonInclude,
    });
    return withComputedStatus(lesson);
  }

  const lesson = await prisma.lesson.create({
    data: {
      moduleId: data.moduleId,
      title: data.title,
      type: data.type,
      contentUrl: data.contentUrl,
      thumbnailUrl: data.thumbnailUrl,
      content: data.content,
      durationMinutes: data.durationMinutes,
      order,
      planAccess: data.planAccess ?? "BOTH",
    },
    include: lessonInclude,
  });
  return withComputedStatus(lesson);
}

async function getLesson(id: string) {
  const lesson = await prisma.lesson.findUnique({ where: { id } });
  if (!lesson) {
    throw new AppError("Lesson not found", 404);
  }
  return lesson;
}

export async function getLessonDetail(id: string) {
  const lesson = await prisma.lesson.findUnique({ where: { id }, include: lessonInclude });
  if (!lesson) {
    throw new AppError("Lesson not found", 404);
  }
  return withComputedStatus(lesson);
}

export async function updateLesson(
  id: string,
  data: Partial<
    Pick<LessonInput, "title" | "contentUrl" | "thumbnailUrl" | "content" | "durationMinutes" | "order" | "planAccess">
  >
) {
  const existing = await getLesson(id);
  if (data.thumbnailUrl && data.thumbnailUrl !== existing.thumbnailUrl) {
    const oldKey = keyFromUrl(existing.thumbnailUrl);
    if (oldKey) await deleteObject(oldKey);
  }
  const contentUrlChanged = data.contentUrl && data.contentUrl !== existing.contentUrl;
  if (contentUrlChanged) {
    const oldKey = keyFromUrl(existing.contentUrl);
    if (oldKey) await deleteObject(oldKey);
  }
  const lesson = await prisma.lesson.update({
    where: { id },
    // Reset HLS state when video is replaced so stale encrypted segments are not served.
    data: contentUrlChanged ? { ...data, hlsStatus: "PENDING", hlsManifestKey: null, hlsEncryptionKey: null } : data,
    include: lessonInclude,
  });
  // Kick off async HLS packaging when a VIDEO lesson gets a new file.
  if (contentUrlChanged && existing.type === "VIDEO") {
    const { triggerHlsPackaging } = await import("./hls.service");
    triggerHlsPackaging(id);
  }
  return withComputedStatus(lesson);
}

export async function deleteLesson(id: string) {
  const lesson = await getLesson(id);
  await prisma.lesson.delete({ where: { id } });
  if (lesson.liveClassId) {
    await prisma.liveClass.delete({ where: { id: lesson.liveClassId } }).catch(() => null);
  }
}

/**
 * `@@unique([moduleId, order])` means swapping two lessons' positions in one pass can collide.
 * Bump everything to negative offsets first, then assign final order values in a second pass,
 * all inside one transaction — same two-pass strategy as module.service.ts#reorderModules.
 */
export async function reorderLessons(moduleId: string, orderedIds: string[]) {
  const lessons = await prisma.lesson.findMany({ where: { moduleId } });
  if (orderedIds.length !== lessons.length || !lessons.every((l) => orderedIds.includes(l.id))) {
    throw new AppError("orderedIds must include exactly the lessons currently in this module", 422);
  }

  await prisma.$transaction([
    ...orderedIds.map((id, index) => prisma.lesson.update({ where: { id }, data: { order: -(index + 1) } })),
    ...orderedIds.map((id, index) => prisma.lesson.update({ where: { id }, data: { order: index + 1 } })),
  ]);

  return listLessons(moduleId);
}

/**
 * Shared by the manual "Schedule" modal PATCH and any status-transition trigger — fires cohort
 * notifications when the live class status changes.
 */
export async function notifyLiveClassTransition(
  lessonId: string,
  before: { status: string },
  liveClass: { id: string; title: string; status: string; recordingUrl: string | null }
) {
  const lesson = await getLesson(lessonId);
  const module = await prisma.module.findUnique({
    where: { id: lesson.moduleId },
    include: { cohort: { select: { id: true, course: { select: { slug: true } } } } },
  });
  if (!module || !module.cohort) return;

  const cohortId = module.cohortId;
  const courseSlug = module.cohort.course.slug;

  if (before.status !== "LIVE" && liveClass.status === "LIVE") {
    await notifyCohort(
      cohortId,
      "CLASS_REMINDER",
      "Live class starting now",
      `"${liveClass.title}" is live now — join from your course roadmap.`,
      { lessonId, liveClassId: liveClass.id, courseSlug, action: "join" }
    ).catch((err) => console.error("[notifyLiveClass] cohort notify failed:", err));
  }

  if (before.status !== "COMPLETED" && liveClass.status === "COMPLETED" && liveClass.recordingUrl) {
    await notifyCohort(
      cohortId,
      "CLASS_REMINDER",
      "Recording available",
      `The recording for "${liveClass.title}" is now available to watch.`,
      { lessonId, liveClassId: liveClass.id, courseSlug, action: "watch" }
    ).catch((err) => console.error("[notifyLiveClass] recording notify failed:", err));
  }

  // Emit a real-time event so the roadmap / learn page refreshes without a manual reload.
  if (before.status !== liveClass.status) {
    const enrollments = await prisma.enrollment.findMany({ where: { cohortId }, select: { userId: true } });
    const { emitToUsers } = await import("./sse.service");
    emitToUsers(enrollments.map((e) => e.userId), "live_class", { lessonId, status: liveClass.status });
  }
}


export async function updateLiveClass(
  lessonId: string,
  data: Partial<{
    title: string;
    startTime: Date;
    endTime: Date;
    mentorId: string;
    joinUrl: string;
    status: "SCHEDULED" | "LIVE" | "COMPLETED" | "CANCELLED";
    recordingUrl: string;
  }>
) {
  const lesson = await getLesson(lessonId);
  if (!lesson.liveClassId) {
    throw new AppError("This lesson does not have a scheduled live session", 422);
  }
  const before = await prisma.liveClass.findUniqueOrThrow({ where: { id: lesson.liveClassId } });
  const liveClass = await prisma.liveClass.update({ where: { id: lesson.liveClassId }, data });

  await notifyLiveClassTransition(lessonId, before, liveClass);

  return { ...liveClass, isLiveNow: isLiveNow(liveClass) };
}

/** Host (Admin/Mentor/Cohort Manager) of this specific live class, or Admin generally — deliberately not gated by `course:write`, since a Cohort Manager host doesn't hold that permission but should still be able to upload their own session's recording. */
async function assertCanManageRecording(lessonId: string, userId: string) {
  const lesson = await getLesson(lessonId);
  if (!lesson.liveClassId) {
    throw new AppError("This lesson does not have a scheduled live session", 422);
  }
  const liveClass = await prisma.liveClass.findUniqueOrThrow({ where: { id: lesson.liveClassId } });

  const user = await prisma.user.findUnique({ where: { id: userId }, include: { role: true } });
  if (user?.role.name !== "Admin" && liveClass.mentorId !== userId) {
    throw new AppError("Only this session's host or an Admin can upload its recording", 403);
  }
  return { lesson, liveClass };
}

/**
 * Step 1 of the host-uploaded-recording flow: mints a presigned S3 PUT URL so the (potentially
 * multi-gigabyte) recording file goes straight from the host's browser to S3, never through our
 * own server. Required for Zoho (no reliable automatic pull); also available as an override for
 * Zoom, whose `recording.completed` webhook auto-download (zoomWebhook.service.ts) is unchanged
 * and still runs independently of this.
 */
export async function presignRecordingUpload(lessonId: string, userId: string, contentType: string) {
  const { lesson, liveClass } = await assertCanManageRecording(lessonId, userId);
  const ext = contentType === "video/webm" ? ".webm" : ".mp4";
  const key = await buildRecordingKey(lesson, liveClass);
  const uploadUrl = await getPresignedPutUrl(`${key}${ext}`, contentType);
  return { key: `${key}${ext}`, uploadUrl };
}

/** Builds a human-readable, structured S3 key: cohort_name/module_title/lesson_title_date */
async function buildRecordingKey(
  lesson: { id: string; title: string; moduleId: string },
  liveClass: { id: string; startTime: Date; cohortId: string | null }
) {
  const slug = (s: string) =>
    s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 50);

  const dateStr = liveClass.startTime.toISOString().slice(0, 10);

  const module = await prisma.module.findUnique({
    where: { id: lesson.moduleId },
    include: { cohort: { select: { name: true } } },
  });

  let cohortName = "general";
  if (liveClass.cohortId) {
    const cohort = await prisma.cohort.findUnique({ where: { id: liveClass.cohortId }, select: { name: true } });
    if (cohort) cohortName = cohort.name;
  } else if (module?.cohort?.name) {
    cohortName = module.cohort.name;
  }

  const modulePart = module?.title ? slug(module.title) : "module";
  const lessonPart = lesson.title ? slug(lesson.title) : liveClass.id;

  return `recordings/${slug(cohortName)}/${modulePart}/${lessonPart}_${dateStr}`;
}

/** Step 2: called once the browser's direct S3 upload finishes — records the S3 key, marks the session COMPLETED, and notifies the cohort. */
export async function finalizeRecordingUpload(lessonId: string, userId: string, key: string) {
  const { liveClass } = await assertCanManageRecording(lessonId, userId);
  const before = { status: liveClass.status };
  const updated = await prisma.liveClass.update({
    where: { id: liveClass.id },
    data: { recordingUrl: key, status: "COMPLETED", endedAt: liveClass.endedAt ?? new Date() },
  });

  await notifyLiveClassTransition(lessonId, before, updated);
  return { ...updated, isLiveNow: isLiveNow(updated) };
}

const RECORDING_STAFF_ROLES = ["Admin", "Mentor", "Cohort Manager"];

/**
 * The only way a recording's actual playback URL is ever produced — re-derives the exact same
 * plan-lock + `recordingAccessExpiresAt` checks `progress.service.ts#getCourseRoadmapForUser`
 * already computes for the `hasRecording` flag, never trusting that flag alone. Returns a
 * short-lived signed S3 URL, not the raw key.
 */
export async function getRecordingSignedUrl(lessonId: string, userId: string) {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { module: true, liveClass: true },
  });
  if (!lesson?.liveClass?.recordingUrl) {
    throw new AppError("No recording is available for this lesson", 404);
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, include: { role: true } });
  const isStaff = RECORDING_STAFF_ROLES.includes(user?.role.name ?? "");

  if (!isStaff) {
    const enrollment = await prisma.enrollment.findFirst({
      where: { userId, cohortId: lesson.module.cohortId },
    });
    if (!enrollment) {
      throw new AppError("You don't have access to this recording", 403);
    }
    if (enrollment.recordingAccessExpiresAt && enrollment.recordingAccessExpiresAt < new Date()) {
      throw new AppError("Your recording access has expired", 403);
    }
    const isLockedFor = (planAccess: string) => planAccess !== "BOTH" && planAccess !== enrollment.plan;
    if (isLockedFor(lesson.module.planAccess) || isLockedFor(lesson.planAccess)) {
      throw new AppError("This recording is part of the Intensive Pro plan", 403);
    }
  }

  const url = lesson.liveClass.recordingUrl;
  // External URLs (YouTube, Vimeo, direct links) are stored as-is and returned without presigning.
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  return getPresignedGetUrl(url);
}

/**
 * Same protection model as `getRecordingSignedUrl`, but for a regular VIDEO-type lesson's own
 * `contentUrl` (an S3 key once uploaded through the protected upload path) — not just live-class
 * recordings. LMS-access expiry is already enforced higher up (the roadmap fetch itself throws
 * once `lmsAccessExpiresAt` has passed), so this only re-checks the plan-lock, not access expiry.
 * YouTube-hosted lesson content never calls this — `extractYouTubeId` routes those to the
 * existing `YouTubePlayer` path instead, since they're not S3 objects.
 */
export async function getContentSignedUrl(lessonId: string, userId: string) {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { module: true },
  });
  if (!lesson?.contentUrl) {
    throw new AppError("No video content is available for this lesson", 404);
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, include: { role: true } });
  const isStaff = RECORDING_STAFF_ROLES.includes(user?.role.name ?? "");

  if (!isStaff) {
    const enrollment = await prisma.enrollment.findFirst({
      where: { userId, cohortId: lesson.module.cohortId },
    });
    if (!enrollment) {
      throw new AppError("You don't have access to this lesson", 403);
    }
    const PLAN_RANK: Record<string, number> = { ICAP: 1, INTENSIVE_PRO: 2 };
    const userRank = PLAN_RANK[enrollment.plan] ?? 0;
    const isLockedFor = (pa: string) => pa !== "BOTH" && (PLAN_RANK[pa] ?? 0) > userRank;
    if (isLockedFor(lesson.module.planAccess) || isLockedFor(lesson.planAccess)) {
      throw new AppError("This lesson is part of the Intensive Pro plan", 403);
    }
  }

  // `contentUrl` is stored as the full `${PUBLIC_API_URL}/api/files/<key>` redirect URL (see
  // upload.controller.ts#persist), not a bare key — extract just the key for signing.
  const key = lesson.contentUrl.split("/api/files/")[1];
  if (!key) {
    throw new AppError("This lesson's video isn't an uploaded file", 422);
  }
  return getPresignedGetUrl(key);
}

/**
 * Returns a short-lived server-signed stream token for the lesson's video content.
 * The token is used by GET /api/lessons/:id/stream to proxy the S3 object — the S3 URL
 * is never sent to the browser, so students cannot extract it via DevTools.
 */
/** Validates access then returns the delivery URL and type for the lesson video. */
export async function getContentUrl(
  lessonId: string,
  userId: string,
  clientIp: string,
): Promise<{ url: string; type: "hls" | "mp4"; hlsProcessing?: boolean }> {
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, include: { module: true } });
  if (!lesson?.contentUrl) throw new AppError("No video content for this lesson", 404);

  const user = await prisma.user.findUnique({ where: { id: userId }, include: { role: true } });
  const isStaff = RECORDING_STAFF_ROLES.includes(user?.role.name ?? "");

  if (!isStaff) {
    const enrollment = await prisma.enrollment.findFirst({ where: { userId, cohortId: lesson.module.cohortId } });
    if (!enrollment) throw new AppError("You don't have access to this lesson", 403);
    const PLAN_RANK: Record<string, number> = { ICAP: 1, INTENSIVE_PRO: 2 };
    const userRank = PLAN_RANK[enrollment.plan] ?? 0;
    const isLockedFor = (pa: string) => pa !== "BOTH" && (PLAN_RANK[pa] ?? 0) > userRank;
    if (isLockedFor(lesson.module.planAccess) || isLockedFor(lesson.planAccess)) {
      throw new AppError("This lesson requires the Intensive Pro plan", 403);
    }
  }

  const { signStreamToken } = await import("./token.service");
  const token = signStreamToken(lessonId, userId, clientIp);

  // HLS is ready — serve the encrypted manifest.
  if (lesson.hlsStatus === "READY" && lesson.hlsManifestKey) {
    return {
      url: `/api/lessons/${lessonId}/hls-manifest?t=${encodeURIComponent(token)}`,
      type: "hls",
    };
  }

  // HLS is being packaged — let the player know while falling back to the raw stream proxy.
  return {
    url: `/api/lessons/${lessonId}/stream?t=${encodeURIComponent(token)}`,
    type: "mp4",
    hlsProcessing: lesson.hlsStatus === "PROCESSING" || lesson.hlsStatus === "PENDING",
  };
}

/**
 * Validates the stream token and proxies the S3 object to the response with full Range support.
 * Called by GET /api/lessons/:id/stream?t=TOKEN (no auth middleware — token carries identity).
 */
export async function streamLessonContent(
  lessonId: string,
  token: string,
  rangeHeader: string | undefined,
  clientIp: string,
  res: import("express").Response,
): Promise<void> {
  const { verifyStreamToken } = await import("./token.service");
  let payload: { lessonId: string; userId: string };
  try {
    payload = verifyStreamToken(token, clientIp);
  } catch {
    throw new AppError("Invalid or expired stream token", 401);
  }
  if (payload.lessonId !== lessonId) throw new AppError("Token does not match this lesson", 401);

  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
  if (!lesson?.contentUrl) throw new AppError("No video content for this lesson", 404);

  const key = lesson.contentUrl.split("/api/files/")[1];
  if (!key) throw new AppError("This lesson's video isn't an uploaded file", 422);

  const { proxyS3Stream } = await import("../lib/s3");
  await proxyS3Stream(key, rangeHeader, res);
}
