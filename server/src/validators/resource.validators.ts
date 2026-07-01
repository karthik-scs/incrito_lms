import { z } from "zod";

export const RESOURCE_TYPES = ["PDF", "DOCX", "EXCEL", "VIDEO", "IMAGE"] as const;

export const createResourceSchema = z.object({
  lessonId: z.string().min(1),
  title: z.string().min(1).max(200),
  fileUrl: z.string().url(),
  fileType: z.enum(RESOURCE_TYPES),
});

export const updateResourceSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  fileUrl: z.string().url().optional(),
  fileType: z.enum(RESOURCE_TYPES).optional(),
});
