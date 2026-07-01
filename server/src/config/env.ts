import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1).default("redis://localhost:6379"),
  JWT_ACCESS_SECRET: z.string().min(1),
  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().default(15 * 60),
  REFRESH_TOKEN_TTL_SECONDS: z.coerce.number().default(30 * 24 * 60 * 60),
  CORS_ORIGIN: z.string().default("http://localhost:3000,http://localhost:3001"),
  /** Used to build URLs for uploaded files (avatars, thumbnails, recordings, etc.) — must be reachable
   *  by whatever's rendering them in a browser, so keep this as localhost for local dev even when
   *  PUBLIC_WEBHOOK_URL below points at a tunnel (ngrok's free-tier browser-warning interstitial
   *  intercepts <img>/<video> tag requests, which can't send the bypass header, so a tunnel URL here
   *  breaks every uploaded image/file from ever rendering). */
  PUBLIC_API_URL: z.string().default("http://localhost:4000"),
  /** Used only to build the Zoom webhook URL shown in Settings — this one DOES need to be a real
   *  public URL (e.g. an ngrok tunnel) since Zoom's servers call it directly, not a browser. Falls
   *  back to PUBLIC_API_URL if unset, which is fine for any environment that's already public. */
  PUBLIC_WEBHOOK_URL: z.string().optional(),
  SEED_ADMIN_EMAIL: z.string().optional(),
  SEED_ADMIN_PASSWORD: z.string().optional(),
  ALLOW_PROD_SEED: z.coerce.boolean().default(false),
  /**
   * Dev/test escape hatch: set this to override the random OTP with a fixed code (e.g. "123456").
   * Leave unset in production so that a cryptographically random 6-digit code is generated and
   * emailed to the user on every request.
   */
  OTP_STATIC_CODE: z.string().regex(/^\d{6}$/).optional(),
  EMAIL_VERIFICATION_TTL_SECONDS: z.coerce.number().default(10 * 60),
  PASSWORD_RESET_TTL_SECONDS: z.coerce.number().default(10 * 60),

  /**
   * AWS S3 — all uploaded media (avatars, attachments, resources, recordings) lives here, never
   * on local disk. Optional at boot (so the app still starts without them configured, matching
   * every other third-party integration's graceful-degradation pattern); `s3.ts` throws a clear
   * setup error the moment an actual upload/download is attempted without these set.
   */
  AWS_REGION: z.string().optional(),
  AWS_S3_BUCKET: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  /** How long a signed GET URL for protected content (recordings/resources) stays valid. */
  S3_SIGNED_URL_TTL_SECONDS: z.coerce.number().default(10 * 60),

  /**
   * Zoho OAuth — one self-client app registered once at the org level in the Zoho API Console.
   * Each Mentor/Cohort Manager/Admin does their own one-time consent (standard authorization-code
   * flow) to link their personal Zoho Workplace account; only the resulting per-user refresh token
   * is stored (in `UserLiveAccount`), never these app-level secrets.
   */
  ZOHO_CLIENT_ID: z.string().optional(),
  ZOHO_CLIENT_SECRET: z.string().optional(),
  /** Zoho is region-sharded — must match where the org's Zoho account actually lives. */
  ZOHO_ACCOUNTS_DOMAIN: z.string().default("https://accounts.zoho.com"),
  ZOHO_API_DOMAIN: z.string().default("https://meeting.zoho.com"),
});

const parsedEnv = envSchema.parse(process.env);

export const env = {
  ...parsedEnv,
  /** next dev falls back to 3001+ when 3000 is taken — accept any configured origin, not just the first. */
  corsOrigins: parsedEnv.CORS_ORIGIN.split(",").map((origin) => origin.trim()),
  publicWebhookUrl: parsedEnv.PUBLIC_WEBHOOK_URL ?? parsedEnv.PUBLIC_API_URL,
  /** Zoho calls this directly after a user consents — needs the same public-URL caveat as the Zoom webhook URL. */
  zohoRedirectUri: `${parsedEnv.PUBLIC_WEBHOOK_URL ?? parsedEnv.PUBLIC_API_URL}/api/live-accounts/zoho/callback`,
  /** Where the Zoho OAuth callback sends the browser back to once it's done — the first configured frontend origin. */
  frontendUrl: parsedEnv.CORS_ORIGIN.split(",")[0].trim(),
};
