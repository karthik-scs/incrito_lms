import { z } from "zod";

export const createCourseCertificateSchema = z.object({
  courseId: z.string().min(1),
  templateId: z.string().min(1),
  title: z.string().min(1).max(200),
  scope: z.enum(["COURSE", "MODULES"]).default("COURSE"),
  moduleIds: z.array(z.string().min(1)).optional(),
  planAccess: z.enum(["ICAP", "INTENSIVE_PRO", "BOTH"]).default("BOTH"),
});

export const updateCourseCertificateSchema = z.object({
  templateId: z.string().min(1).optional(),
  title: z.string().min(1).max(200).optional(),
  scope: z.enum(["COURSE", "MODULES"]).optional(),
  moduleIds: z.array(z.string().min(1)).optional(),
  planAccess: z.enum(["ICAP", "INTENSIVE_PRO", "BOTH"]).optional(),
});
