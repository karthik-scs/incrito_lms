import { prisma } from "../lib/prisma";
import { AppError } from "../utils/AppError";
import { createMeeting, createMeetingWithCredentials } from "../lib/zoom";
import { createZohoMeeting } from "../lib/zoho";
import { generateMeetingSdkSignature } from "../lib/zoomSdkSignature";
import { buildS3Key, getPresignedPutUrl, getPresignedGetUrl } from "../lib/s3";
import { notifyCohort } from "./notification.service";

const lessonInclude = {
  liveClass: { include: { mentor: { select: { id: true, firstName: true, lastName: true } } } },
  resources: true,
} as const;

type LiveClassInput = {
  startTime: Date;
  endTime: Date;
  mentorId: string;
  /** The host's own connected Zoom/Zoho account, if they picked one — omitted falls back to the shared Zoom pool. */
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
 * Joinable from 10 minutes before the scheduled start onward — deliberately with no cutoff at
 * the scheduled `endTime`. Zoom's `meeting.started`/`meeting.ended` webhooks (see
 * zoomWebhook.service.ts) are what actually flip `status` to `LIVE`/`COMPLETED` once real
 * meeting activity happens; this is just the "close enough to start, allow joining a bit early"
 * window for a session that's still `SCHEDULED` and hasn't reported as started yet.
 */
export function isLiveNow(liveClass: { startTime: Date; status: string }) {
  if (liveClass.status === "LIVE") return true;
  if (liveClass.status === "CANCELLED" || liveClass.status === "COMPLETED") return false;
  return Date.now() >= liveClass.startTime.getTime() - 10 * 60 * 1000;
}

function withComputedStatus<T extends { liveClass: { startTime: Date; status: string } | null }>(lesson: T) {
  return {
    ...lesson,
    liveClass: lesson.liveClass ? { ...lesson.liveClass, isLiveNow: isLiveNow(lesson.liveClass) } : null,
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
  provider: "ZOOM" | "ZOHO";
  userLiveAccountId: string | null;
  zoomMeetingId: string | null;
  zoomAccountId: string | null;
  zoomPasscode: string | null;
  zohoMeetingId: string | null;
  joinUrl: string;
  hostStartUrl: string;
};

/**
 * Both providers open in a new tab to start/join (no in-app embedding, by explicit decision) — so
 * this only decides *who* schedules the meeting and *where*, not how the join UI behaves.
 */
async function scheduleLiveMeeting(input: LiveClassInput, topic: string): Promise<ScheduledMeeting> {
  if (input.userLiveAccountId) {
    const account = await prisma.userLiveAccount.findUnique({ where: { id: input.userLiveAccountId } });
    if (!account || account.userId !== input.mentorId || !account.isActive) {
      throw new AppError("That connected account doesn't belong to this host or is no longer active", 422);
    }

    if (account.provider === "ZOHO") {
      const meeting = await createZohoMeeting(account.id, { topic, startTime: input.startTime, endTime: input.endTime });
      return {
        provider: "ZOHO",
        userLiveAccountId: account.id,
        zoomMeetingId: null,
        zoomAccountId: null,
        zoomPasscode: null,
        zohoMeetingId: meeting.zohoMeetingId,
        joinUrl: meeting.joinUrl,
        hostStartUrl: meeting.hostStartUrl,
      };
    }

    if (!account.zoomAccountId || !account.zoomClientId || !account.zoomClientSecret) {
      throw new AppError("This Zoom account isn't fully connected — reconnect it in Settings.", 422);
    }
    const meeting = await createMeetingWithCredentials(
      { id: account.id, label: "Personal Zoom", zoomAccountId: account.zoomAccountId, clientId: account.zoomClientId, clientSecret: account.zoomClientSecret },
      { topic, startTime: input.startTime, endTime: input.endTime }
    );
    return {
      provider: "ZOOM",
      userLiveAccountId: account.id,
      zoomMeetingId: meeting.zoomMeetingId,
      zoomAccountId: null,
      zoomPasscode: meeting.passcode,
      zohoMeetingId: null,
      joinUrl: meeting.joinUrl,
      hostStartUrl: meeting.hostStartUrl,
    };
  }

  // No personal account picked — fall back to the shared admin-managed Zoom pool (unchanged).
  const meeting = await createMeeting({ topic, startTime: input.startTime, endTime: input.endTime });
  return {
    provider: "ZOOM",
    userLiveAccountId: null,
    zoomMeetingId: meeting.zoomMeetingId,
    zoomAccountId: meeting.zoomAccountId,
    zoomPasscode: meeting.passcode,
    zohoMeetingId: null,
    joinUrl: meeting.joinUrl,
    hostStartUrl: meeting.hostStartUrl,
  };
}

export async function createLesson(data: LessonInput) {
  const module = await prisma.module.findUnique({ where: { id: data.moduleId }, include: { course: true } });
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

    // Auto-generate the meeting — admins/mentors/cohort managers schedule the session, they don't
    // paste a link. If the host picked one of their own connected accounts, it's scheduled there
    // (Zoom or Zoho); otherwise this falls back to the shared admin-managed Zoom pool, which
    // rotates across whichever account has spare concurrent-meeting capacity for this time window
    // (see zoom.ts#pickZoomAccount).
    const scheduled = await scheduleLiveMeeting(data.liveClass, data.title);

    const liveClass = await prisma.liveClass.create({
      data: {
        title: data.title,
        mentorId: data.liveClass.mentorId,
        startTime: data.liveClass.startTime,
        endTime: data.liveClass.endTime,
        provider: scheduled.provider,
        userLiveAccountId: scheduled.userLiveAccountId,
        zoomMeetingId: scheduled.zoomMeetingId,
        zoomAccountId: scheduled.zoomAccountId,
        zoomPasscode: scheduled.zoomPasscode,
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
  await getLesson(id);
  const lesson = await prisma.lesson.update({ where: { id }, data, include: lessonInclude });
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
 * Shared by the manual "Schedule" modal PATCH and the Zoom webhook handler — both can flip a
 * live class's status, and both need to fire the same cohort notifications when they do.
 */
export async function notifyLiveClassTransition(
  lessonId: string,
  before: { status: string },
  liveClass: { id: string; title: string; status: string; recordingUrl: string | null }
) {
  const lesson = await getLesson(lessonId);
  const module = await prisma.module.findUnique({ where: { id: lesson.moduleId }, include: { course: { select: { slug: true } } } });
  if (!module) return;

  const cohorts = await prisma.cohort.findMany({ where: { courseId: module.courseId }, select: { id: true } });

  if (before.status !== "LIVE" && liveClass.status === "LIVE") {
    await Promise.all(
      cohorts.map((c) =>
        notifyCohort(
          c.id,
          "CLASS_REMINDER",
          "Live class starting now",
          `"${liveClass.title}" is live now — join from your course roadmap.`,
          { lessonId, liveClassId: liveClass.id, courseSlug: module.course.slug, action: "join" }
        ).catch(() => null)
      )
    );
  }

  if (before.status !== "COMPLETED" && liveClass.status === "COMPLETED" && liveClass.recordingUrl) {
    await Promise.all(
      cohorts.map((c) =>
        notifyCohort(
          c.id,
          "CLASS_REMINDER",
          "Recording available",
          `The recording for "${liveClass.title}" is now available to watch.`,
          { lessonId, liveClassId: liveClass.id, courseSlug: module.course.slug, action: "watch" }
        ).catch(() => null)
      )
    );
  }
}

/**
 * Real in-app meeting embedding — only possible once a Meeting SDK key/secret is configured on
 * the ZoomAccount this lesson's session was scheduled under (separate credentials from the
 * Server-to-Server OAuth app that scheduled it). Returns `configured: false` otherwise, so the
 * frontend can fall back to opening the Zoom join link in a new tab without lying about it.
 */
export async function getZoomSdkSignature(lessonId: string, userId: string) {
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, include: { liveClass: true } });
  if (!lesson?.liveClass?.zoomMeetingId) {
    throw new AppError("This lesson has no live session to join", 404);
  }

  const account = lesson.liveClass.zoomAccountId
    ? await prisma.zoomAccount.findUnique({ where: { id: lesson.liveClass.zoomAccountId } })
    : null;

  if (!account?.sdkKey || !account?.sdkSecret) {
    return { configured: false as const };
  }

  const role = lesson.liveClass.mentorId === userId ? 1 : 0;
  const signature = generateMeetingSdkSignature(account.sdkKey, account.sdkSecret, lesson.liveClass.zoomMeetingId, role);

  return {
    configured: true as const,
    signature,
    sdkKey: account.sdkKey,
    meetingNumber: lesson.liveClass.zoomMeetingId,
    passcode: lesson.liveClass.zoomPasscode,
    role,
  };
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
    include: { course: { include: { cohorts: { take: 1, orderBy: { startDate: "desc" } } } } },
  });

  let cohortName = "general";
  if (liveClass.cohortId) {
    const cohort = await prisma.cohort.findUnique({ where: { id: liveClass.cohortId }, select: { name: true } });
    if (cohort) cohortName = cohort.name;
  } else if (module?.course?.cohorts[0]?.name) {
    cohortName = module.course.cohorts[0].name;
  }

  const modulePart = module?.title ? slug(module.title) : "module";
  const lessonPart = lesson.title ? slug(lesson.title) : liveClass.id;

  return `recordings/${slug(cohortName)}/${modulePart}/${lessonPart}_${dateStr}`;
}

/** Step 2: called once the browser's direct S3 upload finishes — records the S3 key, marks the session COMPLETED (a recording existing implies it's over), and notifies the cohort, same as the automatic Zoom webhook path does. */
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
    include: { module: { include: { course: true } }, liveClass: true },
  });
  if (!lesson?.liveClass?.recordingUrl) {
    throw new AppError("No recording is available for this lesson", 404);
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, include: { role: true } });
  const isStaff = RECORDING_STAFF_ROLES.includes(user?.role.name ?? "");

  if (!isStaff) {
    const enrollment = await prisma.enrollment.findFirst({
      where: { userId, cohort: { courseId: lesson.module.courseId } },
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

  return getPresignedGetUrl(lesson.liveClass.recordingUrl);
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
    include: { module: { include: { course: true } } },
  });
  if (!lesson?.contentUrl) {
    throw new AppError("No video content is available for this lesson", 404);
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, include: { role: true } });
  const isStaff = RECORDING_STAFF_ROLES.includes(user?.role.name ?? "");

  if (!isStaff) {
    const enrollment = await prisma.enrollment.findFirst({
      where: { userId, cohort: { courseId: lesson.module.courseId } },
    });
    if (!enrollment) {
      throw new AppError("You don't have access to this lesson", 403);
    }
    const isLockedFor = (planAccess: string) => planAccess !== "BOTH" && planAccess !== enrollment.plan;
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
