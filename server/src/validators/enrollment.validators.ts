import { z } from "zod";

export const createEnrollmentSchema = z.object({
  userId: z.string().min(1),
  cohortId: z.string().min(1),
  status: z.enum(["PENDING", "ACTIVE", "COMPLETED", "DROPPED"]).optional(),
  plan: z.enum(["ICAP", "INTENSIVE_PRO"]).optional(),
});

export const updateEnrollmentStatusSchema = z.object({
  status: z.enum(["PENDING", "ACTIVE", "COMPLETED", "DROPPED"]),
});

export const updateEnrollmentPlanSchema = z.object({
  plan: z.enum(["ICAP", "INTENSIVE_PRO"]),
});
