import { z } from "zod";

export const connectZoomAccountSchema = z.object({
  zoomAccountId: z.string().min(1),
  zoomClientId: z.string().min(1),
  zoomClientSecret: z.string().min(1),
  zoomSecretToken: z.string().min(1),
});
