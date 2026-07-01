import { z } from "zod";

const planKey = z
  .string()
  .min(1)
  .max(50)
  .regex(/^[A-Z0-9_]+$/, "Plan key must be uppercase letters, digits, and underscores only");

export const createPlanSettingSchema = z.object({
  plan: planKey,
  displayName: z.string().min(1).max(100),
  lmsAccessDurationValue: z.number().int().positive(),
  lmsAccessDurationUnit: z.enum(["DAYS", "MONTHS", "YEARS"]),
  recordingAccessDurationValue: z.number().int().positive(),
  recordingAccessDurationUnit: z.enum(["DAYS", "MONTHS", "YEARS"]),
  canAccess1on1Calls: z.boolean().optional(),
  mentorCallLimitPerMonth: z.number().int().min(0).nullable().optional(),
  studentCallLimitPerMonth: z.number().int().min(0).nullable().optional(),
  canDownloadResources: z.boolean().optional(),
  canAccessRecordings: z.boolean().optional(),
  canAccessCommunity: z.boolean().optional(),
});

export const updatePlanSettingSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  lmsAccessDurationValue: z.number().int().positive().optional(),
  lmsAccessDurationUnit: z.enum(["DAYS", "MONTHS", "YEARS"]).optional(),
  recordingAccessDurationValue: z.number().int().positive().optional(),
  recordingAccessDurationUnit: z.enum(["DAYS", "MONTHS", "YEARS"]).optional(),
  canAccess1on1Calls: z.boolean().optional(),
  mentorCallLimitPerMonth: z.number().int().min(0).nullable().optional(),
  studentCallLimitPerMonth: z.number().int().min(0).nullable().optional(),
  canDownloadResources: z.boolean().optional(),
  canAccessRecordings: z.boolean().optional(),
  canAccessCommunity: z.boolean().optional(),
});
