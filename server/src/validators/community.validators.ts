import { z } from "zod";

export const createCommunitySchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  coverUrl: z.string().url().optional(),
});

export const updateCommunitySchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(500).optional(),
  coverUrl: z.string().url().optional(),
});

export const addMemberSchema = z.object({
  userId: z.string().min(1),
});

export const createCommunityPostSchema = z.object({
  title: z.string().min(1).max(300),
  content: z.string().min(1),
  attachmentUrl: z.string().url().optional(),
  attachmentType: z.string().optional(),
});

export const createCommunityCommentSchema = z.object({
  content: z.string().optional(),
  parentCommentId: z.string().optional(),
  attachmentUrl: z.string().url().optional(),
  attachmentType: z.string().optional(),
}).refine((d) => d.content || d.attachmentUrl, {
  message: "Comment must have content or an attachment",
});

export const editCommentSchema = z.object({
  content: z.string().min(1),
});

export const reactSchema = z.object({
  emoji: z.string().min(1).max(8),
});
