import { z } from "zod";

export const createTagSchema = z.object({
  name: z.string().min(1).max(50),
  slug: z.string().min(1).max(60),
});

export const updateTagSchema = createTagSchema.partial();
