import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate } from "../middleware/authenticate";
import { validate } from "../middleware/validate";
import { rateLimiter } from "../middleware/rateLimiter";
import { REDIS_KEYS } from "../lib/redis";
import {
  signupSchema,
  loginSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
  checkPasswordResetCodeSchema,
} from "../validators/auth.validators";
import { mfaActivateSchema, mfaDisableSchema, mfaChallengeSchema } from "../validators/mfa.validators";
import { updateProfileSchema, changePasswordSchema } from "../validators/profile.validators";
import { avatarUpload } from "../lib/uploads";
import * as authController from "../controllers/auth.controller";

const router = Router();

const authRateLimit = rateLimiter({
  keyFor: (req) => REDIS_KEYS.authRateLimit(req.ip ?? "unknown"),
  limit: 10,
  windowSeconds: 60,
});

const otpRateLimit = rateLimiter({
  keyFor: (req) => REDIS_KEYS.otpRateLimit(req.body?.email ?? "unknown"),
  limit: 5,
  windowSeconds: 5 * 60,
});

router.post("/signup", authRateLimit, validate(signupSchema), asyncHandler(authController.signup));
router.post(
  "/verify-email",
  otpRateLimit,
  validate(verifyEmailSchema),
  asyncHandler(authController.verifyEmail)
);
router.post(
  "/resend-verification",
  otpRateLimit,
  validate(resendVerificationSchema),
  asyncHandler(authController.resendVerification)
);
router.post("/login", authRateLimit, validate(loginSchema), asyncHandler(authController.login));
router.post(
  "/request-password-reset",
  otpRateLimit,
  validate(requestPasswordResetSchema),
  asyncHandler(authController.requestPasswordReset)
);
router.post(
  "/check-password-reset-code",
  otpRateLimit,
  validate(checkPasswordResetCodeSchema),
  asyncHandler(authController.checkPasswordResetCode)
);
router.post(
  "/reset-password",
  otpRateLimit,
  validate(resetPasswordSchema),
  asyncHandler(authController.resetPassword)
);
router.post("/refresh", asyncHandler(authController.refresh));
router.post("/logout", asyncHandler(authController.logout));
router.get("/me", authenticate, asyncHandler(authController.me));
router.patch("/me", authenticate, validate(updateProfileSchema), asyncHandler(authController.updateProfile));
router.post(
  "/me/avatar",
  authenticate,
  avatarUpload.single("avatar"),
  asyncHandler(authController.uploadAvatar)
);
router.post(
  "/change-password",
  authenticate,
  validate(changePasswordSchema),
  asyncHandler(authController.changePassword)
);
router.get("/sessions", authenticate, asyncHandler(authController.listSessions));
router.delete("/sessions/:sessionId", authenticate, asyncHandler(authController.revokeSession));

// MFA — challenge is unauthenticated (called before full tokens exist); setup/activate/disable require auth
router.post("/mfa/challenge", validate(mfaChallengeSchema), asyncHandler(authController.mfaChallenge));
router.post("/mfa/setup", authenticate, asyncHandler(authController.mfaSetup));
router.post("/mfa/activate", authenticate, validate(mfaActivateSchema), asyncHandler(authController.mfaActivate));
router.delete("/mfa", authenticate, validate(mfaDisableSchema), asyncHandler(authController.mfaDisable));

export default router;
