import { z } from "zod";

export const createAnnouncementSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(5000),
  audience: z.enum(["ALL", "STUDENTS", "MENTORS", "COHORT_MANAGERS"]).default("ALL"),
});
