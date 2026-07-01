import { z } from "zod";

export const createCommunityEventSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  startTime: z.coerce.date(),
  endTime: z.coerce.date().optional(),
  location: z.string().max(200).optional(),
});
