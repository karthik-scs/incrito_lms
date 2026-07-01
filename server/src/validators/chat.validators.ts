import { z } from "zod";

export const sendMessageSchema = z
  .object({
    content: z.string().max(2000).optional(),
    attachmentUrl: z.string().url().optional(),
    attachmentType: z.string().optional(),
  })
  .refine((data) => Boolean(data.content?.trim()) || Boolean(data.attachmentUrl), {
    message: "A message needs text or an attachment",
  });

export const startConversationSchema = z.object({
  targetUserId: z.string().min(1),
});

export const setPinnedSchema = z.object({
  pinned: z.boolean(),
});

export const setMessageReactionSchema = z.object({
  emoji: z.string().min(1).max(8).optional(),
});
