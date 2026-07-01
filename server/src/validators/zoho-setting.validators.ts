import { z } from "zod";

export const updateZohoSettingSchema = z.object({
  clientId: z.string().min(1).optional(),
  clientSecret: z.string().min(1).optional(),
  accountsDomain: z.string().url().optional(),
  apiDomain: z.string().url().optional(),
});
