import { z } from "zod";

export const createPostSchema = z.object({
  cohortId: z.string().min(1),
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(5000),
});

export const createCommentSchema = z
  .object({
    content: z.string().max(2000).optional(),
    parentCommentId: z.string().min(1).optional(),
    attachmentUrl: z.string().url().optional(),
    attachmentType: z.string().optional(),
  })
  .refine((data) => Boolean(data.content?.trim()) || Boolean(data.attachmentUrl), {
    message: "A comment needs text or an attachment",
  });

export const editCommentSchema = z.object({
  content: z.string().min(1).max(2000),
});

export const reactSchema = z.object({
  emoji: z.string().min(1).max(8),
});
