import { z } from "zod";

export const updateNotificationPreferenceSchema = z.object({
  emailEnabled: z.boolean().optional(),
  enrollmentEmails: z.boolean().optional(),
  announcementEmails: z.boolean().optional(),
  certificateEmails: z.boolean().optional(),
  productUpdateEmails: z.boolean().optional(),
});
