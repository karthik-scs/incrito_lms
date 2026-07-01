import { z } from "zod";
import { passwordSchema } from "./password.validators";

export const createUserSchema = z.object({
  email: z.string().trim().email(),
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  mobileNumber: z.string().trim().min(6).max(20).optional(),
  password: passwordSchema,
  roleId: z.string().min(1),
});

export const updateUserStatusSchema = z.object({
  status: z.enum(["ACTIVE", "SUSPENDED", "INVITED"]),
});

export const updateUserRoleSchema = z.object({
  roleId: z.string().min(1),
});

export const updateUserSchema = z.object({
  email: z.string().trim().email().optional(),
  firstName: z.string().trim().min(1).max(100).optional(),
  lastName: z.string().trim().min(1).max(100).optional(),
  mobileNumber: z.string().trim().min(6).max(20).optional(),
  roleId: z.string().min(1).optional(),
  status: z.enum(["ACTIVE", "SUSPENDED", "INVITED"]).optional(),
  password: passwordSchema.optional(),
});
