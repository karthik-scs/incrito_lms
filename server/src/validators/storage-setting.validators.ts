import { z } from "zod";

export const updateStorageSettingSchema = z.object({
  endpointUrl: z.string().url().optional(),
  awsRegion: z.string().min(1).optional(),
  awsBucket: z.string().min(1).optional(),
  awsAccessKeyId: z.string().min(1).optional(),
  awsSecretKey: z.string().min(1).optional(),
});
