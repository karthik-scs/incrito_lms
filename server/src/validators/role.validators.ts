import { z } from "zod";

export const createRoleSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().max(300).optional(),
  permissionKeys: z.array(z.string().min(1)).min(1),
});

export const updatePermissionsSchema = z.object({
  permissionKeys: z.array(z.string().min(1)).min(1),
});

export const updateRoleSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  description: z.string().max(300).optional(),
});
