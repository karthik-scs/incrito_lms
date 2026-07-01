import { z } from "zod";

export const createZoomAccountSchema = z.object({
  label: z.string().min(1).max(150),
  zoomAccountId: z.string().min(1),
  clientId: z.string().min(1),
  clientSecret: z.string().min(1),
  secretToken: z.string().min(1),
  sdkKey: z.string().min(1).optional(),
  sdkSecret: z.string().min(1).optional(),
  concurrentLimit: z.number().int().positive().default(2),
  isActive: z.boolean().default(true),
});

export const updateZoomAccountSchema = z.object({
  label: z.string().min(1).max(150).optional(),
  zoomAccountId: z.string().min(1).optional(),
  clientId: z.string().min(1).optional(),
  clientSecret: z.string().min(1).optional(),
  secretToken: z.string().min(1).optional(),
  sdkKey: z.string().min(1).optional(),
  sdkSecret: z.string().min(1).optional(),
  concurrentLimit: z.number().int().positive().optional(),
  isActive: z.boolean().optional(),
});
