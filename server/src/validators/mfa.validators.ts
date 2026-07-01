import { z } from "zod";

const totpCode = z
  .string()
  .regex(/^\d{6}$/, "Authenticator code must be exactly 6 digits");

export const mfaActivateSchema = z.object({ code: totpCode });
export const mfaDisableSchema = z.object({ code: totpCode });
export const mfaChallengeSchema = z.object({
  mfaToken: z.string().min(1, "MFA token is required"),
  code: totpCode,
});
