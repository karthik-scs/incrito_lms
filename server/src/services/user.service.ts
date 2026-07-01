import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { AppError } from "../utils/AppError";
import { env } from "../config/env";

const userSelect = {
  id: true,
  email: true,
  mobileNumber: true,
  firstName: true,
  lastName: true,
  avatarUrl: true,
  status: true,
  createdAt: true,
  role: { select: { id: true, name: true, isSystem: true } },
} as const;

/**
 * The bootstrap admin (`SEED_ADMIN_EMAIL`) is the platform's root account — it's the only way
 * back in if every other admin gets locked out, so it's hidden from user-management UI and
 * protected from being edited, suspended, or role-changed through this same UI.
 */
function isSuperAdmin(email: string) {
  return Boolean(env.SEED_ADMIN_EMAIL) && email === env.SEED_ADMIN_EMAIL;
}

async function assertNotSuperAdmin(id: string) {
  const user = await prisma.user.findUnique({ where: { id }, select: { email: true } });
  if (user && isSuperAdmin(user.email)) {
    throw new AppError("This account can't be edited from here", 403);
  }
}

export function listUsers() {
  return prisma.user.findMany({
    where: env.SEED_ADMIN_EMAIL ? { email: { not: env.SEED_ADMIN_EMAIL } } : undefined,
    select: userSelect,
    orderBy: { createdAt: "desc" },
  });
}

export async function createUser(data: {
  email: string;
  firstName: string;
  lastName: string;
  mobileNumber?: string;
  password: string;
  roleId: string;
}) {
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    throw new AppError("A user with this email already exists", 409);
  }

  const role = await prisma.role.findUnique({ where: { id: data.roleId } });
  if (!role) {
    throw new AppError("Role not found", 404);
  }

  const passwordHash = await bcrypt.hash(data.password, 12);

  return prisma.user.create({
    data: {
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      mobileNumber: data.mobileNumber,
      passwordHash,
      roleId: data.roleId,
      status: "ACTIVE",
      emailVerifiedAt: new Date(),
    },
    select: userSelect,
  });
}

export async function getUser(id: string) {
  const user = await prisma.user.findUnique({ where: { id }, select: userSelect });
  if (!user) {
    throw new AppError("User not found", 404);
  }
  return user;
}

export async function updateUserStatus(id: string, status: "ACTIVE" | "SUSPENDED" | "INVITED") {
  await getUser(id);
  await assertNotSuperAdmin(id);
  return prisma.user.update({ where: { id }, data: { status }, select: userSelect });
}

export async function updateUserRole(id: string, roleId: string) {
  await getUser(id);
  await assertNotSuperAdmin(id);
  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role) {
    throw new AppError("Role not found", 404);
  }
  return prisma.user.update({ where: { id }, data: { roleId }, select: userSelect });
}

export async function updateUser(
  id: string,
  data: {
    email?: string;
    firstName?: string;
    lastName?: string;
    mobileNumber?: string;
    roleId?: string;
    status?: "ACTIVE" | "SUSPENDED" | "INVITED";
    password?: string;
  }
) {
  await getUser(id);
  await assertNotSuperAdmin(id);

  if (data.email) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing && existing.id !== id) {
      throw new AppError("A user with this email already exists", 409);
    }
  }

  if (data.roleId) {
    const role = await prisma.role.findUnique({ where: { id: data.roleId } });
    if (!role) {
      throw new AppError("Role not found", 404);
    }
  }

  const { password, ...rest } = data;

  return prisma.user.update({
    where: { id },
    data: {
      ...rest,
      ...(password ? { passwordHash: await bcrypt.hash(password, 12) } : {}),
    },
    select: userSelect,
  });
}
