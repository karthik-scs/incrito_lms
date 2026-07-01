import { z } from "zod";

export const createCourseSchema = z.object({
  title: z.string().min(1).max(200),
  slug: z.string().min(1).max(220),
  description: z.string().max(5000).optional(),
  thumbnailUrl: z.string().url().optional(),
  categoryId: z.string().optional(),
  tagIds: z.array(z.string()).optional(),
  mentorId: z.string().min(1),
  isFree: z.boolean().default(true),
  priceInSmallestUnit: z.number().int().nonnegative().optional(),
  currency: z.string().length(3).default("INR"),
  unlockMode: z.enum(["SEQUENTIAL", "FREE"]).default("SEQUENTIAL"),
});

export const updateCourseSchema = createCourseSchema.partial().omit({ mentorId: true });

export const publishCourseSchema = z.object({
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
});
