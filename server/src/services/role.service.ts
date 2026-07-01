import { prisma } from "../lib/prisma";
import { AppError } from "../utils/AppError";

export function listRoles() {
  return prisma.role.findMany({
    include: { permissions: { include: { permission: true } } },
    orderBy: { name: "asc" },
  });
}

export function listPermissions() {
  return prisma.permission.findMany({ orderBy: { key: "asc" } });
}

/** Admin-created custom roles (isSystem: false) — e.g. "Support". System roles are seeded, not created via API. */
export async function createCustomRole(data: { name: string; description?: string; permissionKeys: string[] }) {
  const existing = await prisma.role.findUnique({ where: { name: data.name } });
  if (existing) {
    throw new AppError("A role with this name already exists", 409);
  }

  const permissions = await prisma.permission.findMany({ where: { key: { in: data.permissionKeys } } });
  if (permissions.length !== data.permissionKeys.length) {
    throw new AppError("One or more permission keys do not exist", 422);
  }

  return prisma.role.create({
    data: {
      name: data.name,
      description: data.description,
      isSystem: false,
      permissions: {
        create: permissions.map((permission) => ({ permissionId: permission.id })),
      },
    },
    include: { permissions: { include: { permission: true } } },
  });
}

export async function updateRole(roleId: string, data: { name?: string; description?: string }) {
  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role) {
    throw new AppError("Role not found", 404);
  }
  if (role.isSystem) {
    throw new AppError("System roles cannot be renamed", 403);
  }

  if (data.name && data.name !== role.name) {
    const existing = await prisma.role.findUnique({ where: { name: data.name } });
    if (existing) {
      throw new AppError("A role with this name already exists", 409);
    }
  }

  return prisma.role.update({
    where: { id: roleId },
    data,
    include: { permissions: { include: { permission: true } } },
  });
}

export async function deleteRole(roleId: string) {
  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role) {
    throw new AppError("Role not found", 404);
  }
  if (role.isSystem) {
    throw new AppError("System roles cannot be deleted", 403);
  }

  const usersWithRole = await prisma.user.count({ where: { roleId } });
  if (usersWithRole > 0) {
    throw new AppError("Cannot delete a role that is still assigned to users", 409);
  }

  await prisma.rolePermission.deleteMany({ where: { roleId } });
  await prisma.role.delete({ where: { id: roleId } });
}

export async function updateRolePermissions(roleId: string, permissionKeys: string[]) {
  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role) {
    throw new AppError("Role not found", 404);
  }
  // Admin is the only system role whose permissions are immutable — removing permissions from it
  // could lock out all admins. Mentor and Cohort Manager system roles can be edited freely.
  if (role.isSystem && role.name === "Admin") {
    throw new AppError("Admin role permissions cannot be edited", 403);
  }

  const permissions = await prisma.permission.findMany({ where: { key: { in: permissionKeys } } });
  if (permissions.length !== permissionKeys.length) {
    throw new AppError("One or more permission keys do not exist", 422);
  }

  await prisma.rolePermission.deleteMany({ where: { roleId } });
  return prisma.role.update({
    where: { id: roleId },
    data: { permissions: { create: permissions.map((permission) => ({ permissionId: permission.id })) } },
    include: { permissions: { include: { permission: true } } },
  });
}
