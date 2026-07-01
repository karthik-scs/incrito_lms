import { z } from "zod";

export const createCohortSchema = z.object({
  courseId: z.string().min(1),
  name: z.string().min(1).max(150),
  managerIds: z.array(z.string()).optional(),
  mentorIds: z.array(z.string()).optional(),
  status: z.enum(["ACTIVE", "UPCOMING", "COMPLETED", "CANCELLED", "ARCHIVED"]).optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional(),
  capacity: z.number().int().positive().optional(),
});

export const updateCohortSchema = createCohortSchema.partial().omit({ courseId: true });

export const assignCohortMentorSchema = z.object({
  userId: z.string().min(1),
});

export const assignCohortManagerSchema = z.object({
  userId: z.string().min(1),
});
