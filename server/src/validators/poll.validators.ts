import { z } from "zod";

export const createPollSchema = z.object({
  question: z.string().min(1).max(300),
  options: z.array(z.string().min(1).max(120)).min(2).max(8),
});

export const voteSchema = z.object({
  optionId: z.string().min(1),
});
