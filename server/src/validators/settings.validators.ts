import { z } from "zod";

export const updateSettingsSchema = z.object({
  platformName: z.string().min(1).max(150).optional(),
  maintenanceMode: z.boolean().optional(),

  smtpHost: z.string().min(1).max(255).optional(),
  smtpPort: z.number().int().min(1).max(65535).optional(),
  smtpUsername: z.string().max(255).optional(),
  smtpPassword: z.string().max(255).optional(),
  smtpFromName: z.string().max(150).optional(),
  smtpFromEmail: z.string().email().optional(),
  smtpSecure: z.boolean().optional(),

  sessionTimeoutMinutes: z.number().int().min(5).max(1440).optional(),
  maxLoginAttempts: z.number().int().min(1).max(20).optional(),
  enforceTwoFactor: z.boolean().optional(),
  maxDevicesPerUser: z.number().int().min(1).max(20).optional(),

  supportEmail: z.string().email().optional(),
  supportPhone: z.string().max(30).optional(),
  supportCallStart: z.string().max(10).optional(),
  supportCallEnd: z.string().max(10).optional(),
  supportFaqs: z.array(z.object({ question: z.string(), answer: z.string() })).optional(),
});
