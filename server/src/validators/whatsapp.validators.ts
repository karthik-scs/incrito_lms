import { z } from "zod";

export const updateWhatsAppSettingsSchema = z.object({
  enabled: z.boolean().optional(),
  apiProvider: z.string().min(1).max(50).optional(),
  phoneNumberId: z.string().max(50).optional(),
  businessAccountId: z.string().max(50).optional(),
  accessToken: z.string().max(500).optional(),
  webhookVerifyToken: z.string().max(255).optional(),

  classReminderEnabled: z.boolean().optional(),
  deadlineReminderEnabled: z.boolean().optional(),
  enrollmentEnabled: z.boolean().optional(),
  announcementEnabled: z.boolean().optional(),
  certificateIssuedEnabled: z.boolean().optional(),
});

export const createWhatsAppTemplateSchema = z.object({
  name: z.string().min(1).max(150),
  category: z.string().min(1).max(50),
  language: z.string().min(2).max(10).default("en"),
  messageType: z.enum(["TEXT", "MEDIA", "DOCUMENT"]).default("TEXT"),
  bodyText: z.string().min(1).max(2000),
  sampleMediaUrl: z.string().url().optional(),
});

export const updateWhatsAppTemplateSchema = createWhatsAppTemplateSchema.partial();

export const updateWhatsAppTemplateStatusSchema = z.object({
  status: z.enum(["DRAFT", "PENDING_REVIEW", "APPROVED", "REJECTED"]),
});
