import { z } from "zod";

const liveClassInputSchema = z.object({
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
  mentorId: z.string().min(1),
  joinUrl: z.string().url().optional(),
  userLiveAccountId: z.string().min(1).optional(),
});

export const createLessonSchema = z.object({
  moduleId: z.string().min(1),
  title: z.string().min(1).max(200),
  type: z.enum(["VIDEO", "TEXT", "PDF", "LIVE"]).default("VIDEO"),
  contentUrl: z.string().url().optional(),
  thumbnailUrl: z.string().url().optional(),
  content: z.string().optional(),
  durationMinutes: z.number().int().positive().optional(),
  order: z.number().int().positive().optional(),
  planAccess: z.enum(["ICAP", "INTENSIVE_PRO", "BOTH"]).optional(),
  liveClass: liveClassInputSchema.optional(),
});

export const updateLessonSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  contentUrl: z.string().url().optional(),
  thumbnailUrl: z.string().url().optional(),
  content: z.string().optional(),
  durationMinutes: z.number().int().positive().optional(),
  order: z.number().int().positive().optional(),
  planAccess: z.enum(["ICAP", "INTENSIVE_PRO", "BOTH"]).optional(),
});

export const reorderLessonsSchema = z.object({
  moduleId: z.string().min(1),
  orderedIds: z.array(z.string().min(1)).min(1),
});

export const updateLiveClassSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  startTime: z.coerce.date().optional(),
  endTime: z.coerce.date().optional(),
  mentorId: z.string().min(1).optional(),
  joinUrl: z.string().url().optional(),
  status: z.enum(["SCHEDULED", "LIVE", "COMPLETED", "CANCELLED"]).optional(),
  // External URL recording (YouTube, Vimeo, direct link) — stored as-is alongside the S3-key path.
  recordingUrl: z.string().url().optional(),
});

export const presignRecordingSchema = z.object({
  contentType: z.string().min(1),
});

export const finalizeRecordingSchema = z.object({
  key: z.string().min(1),
});
