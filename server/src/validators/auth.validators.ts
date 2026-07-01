import { z } from "zod";
import { passwordSchema, otpCodeSchema } from "./password.validators";

export const signupSchema = z.object({
  email: z.string().trim().email(),
  password: passwordSchema,
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  mobileNumber: z.string().trim().min(6).max(20).optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export const verifyEmailSchema = z.object({
  email: z.string().trim().email(),
  code: otpCodeSchema,
});

export const resendVerificationSchema = z.object({
  email: z.string().trim().email(),
});

export const requestPasswordResetSchema = z.object({
  email: z.string().trim().email(),
});

export const resetPasswordSchema = z.object({
  email: z.string().trim().email(),
  code: otpCodeSchema,
  password: passwordSchema,
});

export const checkPasswordResetCodeSchema = z.object({
  email: z.string().trim().email(),
  code: otpCodeSchema,
});
