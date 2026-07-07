import { z } from "zod";

export const createModuleSchema = z.object({
  cohortId: z.string().min(1),
  title: z.string().min(1).max(200),
  order: z.number().int().positive().optional(),
  planAccess: z.enum(["ICAP", "INTENSIVE_PRO", "BOTH"]).optional(),
});

export const updateModuleSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  order: z.number().int().positive().optional(),
  planAccess: z.enum(["ICAP", "INTENSIVE_PRO", "BOTH"]).optional(),
});

export const reorderModulesSchema = z.object({
  cohortId: z.string().min(1),
  orderedIds: z.array(z.string().min(1)).min(1),
});
