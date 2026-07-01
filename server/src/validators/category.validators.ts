import { z } from "zod";

export const createCategorySchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(120),
});

export const updateCategorySchema = createCategorySchema.partial();
