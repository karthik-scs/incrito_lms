import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { redis, REDIS_KEYS } from "../lib/redis";
import { env } from "../config/env";
import { AppError } from "../utils/AppError";
import type { AuthUser } from "../types/api";
import * as verificationService from "./verification.service";
import {
  signAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  compareRefreshToken,
  packRefreshCookie,
  unpackRefreshCookie,
  signMfaPendingToken,
} from "./token.service";

type SignupInput = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  mobileNumber?: string;
};

type LoginInput = {
  email: string;
  password: string;
};

type RequestContext = {
  userAgent?: string;
  ipAddress?: string;
};

export type AuthResult = {
  user: { id: string; email: string; firstName: string; lastName: string; role: string };
  accessToken: string;
  refreshCookie: string;
  refreshTokenExpiresAt: Date;
};

async function loadAuthUser(userId: string, sessionId: string): Promise<AuthUser> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: { role: { include: { permissions: { include: { permission: true } } } } },
  });

  return {
    id: user.id,
    sessionId,
    roleId: user.roleId,
    roleName: user.role.name,
    permissions: user.role.permissions.map((rp) => rp.permission.key),
  };
}

async function createSession(userId: string, context: RequestContext) {
  // Enforce per-user device limit — revoke the oldest active session when exceeded.
  const settings = await prisma.platformSetting.findFirst().catch(() => null);
  const maxDevices = settings?.maxDevicesPerUser ?? 5;

  const activeSessions = await prisma.session.findMany({
    where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "asc" },
  });

  if (activeSessions.length >= maxDevices) {
    const oldest = activeSessions[0];
    await prisma.session.update({ where: { id: oldest.id }, data: { revokedAt: new Date() } });
    const ttl = Math.max(1, Math.floor((oldest.expiresAt.getTime() - Date.now()) / 1000));
    await redis.set(REDIS_KEYS.revokedSession(oldest.id), "1", "EX", ttl).catch(() => null);
  }

  const rawToken = generateRefreshToken();
  const refreshTokenHash = await hashRefreshToken(rawToken);
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_SECONDS * 1000);

  const session = await prisma.session.create({
    data: {
      userId,
      refreshTokenHash,
      userAgent: context.userAgent,
      ipAddress: context.ipAddress,
      expiresAt,
    },
  });

  return { session, rawToken, expiresAt };
}

/** Exported so the MFA challenge controller can issue full tokens after verifying TOTP. */
export async function buildAuthResult(userId: string, context: RequestContext): Promise<AuthResult> {
  const { session, rawToken, expiresAt } = await createSession(userId, context);
  const authUser = await loadAuthUser(userId, session.id);
  const accessToken = signAccessToken(authUser);

  const dbUser = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: { role: true },
  });

  return {
    user: {
      id: dbUser.id,
      email: dbUser.email,
      firstName: dbUser.firstName,
      lastName: dbUser.lastName,
      role: dbUser.role.name,
    },
    accessToken,
    refreshCookie: packRefreshCookie(session.id, rawToken),
    refreshTokenExpiresAt: expiresAt,
  };
}

export async function signup(input: SignupInput): Promise<{ email: string }> {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new AppError("An account with this email already exists", 409);
  }

  const studentRole = await prisma.role.findUnique({ where: { name: "Student" } });
  if (!studentRole) {
    throw new AppError("Default Student role is not seeded yet", 500);
  }

  const passwordHash = await bcrypt.hash(input.password, 12);

  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      mobileNumber: input.mobileNumber,
      roleId: studentRole.id,
      status: "INVITED",
    },
  });

  await verificationService.issueCode(user.id, "EMAIL_VERIFICATION");

  return { email: user.email };
}

export async function resendVerification(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.status !== "INVITED") {
    // Don't reveal whether the account exists or is already verified.
    return;
  }
  await verificationService.issueCode(user.id, "EMAIL_VERIFICATION");
}

export async function verifyEmail(
  email: string,
  code: string,
  context: RequestContext
): Promise<AuthResult> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new AppError("Invalid email or code", 400);
  }

  await verificationService.consumeCode(user.id, "EMAIL_VERIFICATION", code);

  await prisma.user.update({
    where: { id: user.id },
    data: { status: "ACTIVE", emailVerifiedAt: new Date() },
  });

  return buildAuthResult(user.id, context);
}

export async function getCurrentUser(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: { role: { include: { permissions: { include: { permission: true } } } } },
  });

  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    mobileNumber: user.mobileNumber ?? null,
    avatarUrl: user.avatarUrl,
    role: user.role.name,
    mfaEnabled: user.mfaEnabled,
    permissions: user.role.permissions.map((rp) => rp.permission.key),
  };
}

export async function updateProfile(
  userId: string,
  data: { firstName?: string; lastName?: string; mobileNumber?: string; avatarUrl?: string }
) {
  const user = await prisma.user.update({ where: { id: userId }, data });
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    mobileNumber: user.mobileNumber,
    avatarUrl: user.avatarUrl,
  };
}

export async function updateAvatar(userId: string, avatarUrl: string) {
  return updateProfile(userId, { avatarUrl });
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

  const matches = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!matches) {
    throw new AppError("Current password is incorrect", 401);
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
}

export async function listSessions(userId: string, currentSessionId: string) {
  const sessions = await prisma.session.findMany({
    where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });

  return sessions.map((session) => ({
    id: session.id,
    userAgent: session.userAgent,
    ipAddress: session.ipAddress,
    createdAt: session.createdAt,
    expiresAt: session.expiresAt,
    isCurrent: session.id === currentSessionId,
  }));
}

export async function revokeSession(userId: string, sessionId: string): Promise<void> {
  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session || session.userId !== userId) {
    throw new AppError("Session not found", 404);
  }

  await prisma.session.update({ where: { id: sessionId }, data: { revokedAt: new Date() } });

  const remainingTtlSeconds = Math.max(1, Math.floor((session.expiresAt.getTime() - Date.now()) / 1000));
  await redis.set(REDIS_KEYS.revokedSession(session.id), "1", "EX", remainingTtlSeconds).catch(() => null);
}

export async function login(
  input: LoginInput,
  context: RequestContext
): Promise<AuthResult | { mfaRequired: true; mfaToken: string }> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) {
    throw new AppError("Invalid email or password", 401);
  }

  const passwordMatches = await bcrypt.compare(input.password, user.passwordHash);
  if (!passwordMatches) {
    throw new AppError("Invalid email or password", 401);
  }

  if (user.status === "INVITED") {
    throw new AppError("Please verify your email before signing in", 403, { reason: "EMAIL_NOT_VERIFIED" });
  }

  if (user.status !== "ACTIVE") {
    throw new AppError("This account is not active", 403);
  }

  if (user.mfaEnabled) {
    return { mfaRequired: true, mfaToken: signMfaPendingToken(user.id) };
  }

  return buildAuthResult(user.id, context);
}

export async function requestPasswordReset(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    // Don't reveal whether the account exists.
    return;
  }
  await verificationService.issueCode(user.id, "PASSWORD_RESET");
}

/** Lets the UI confirm the code before showing the new-password fields, without spending it. */
export async function checkPasswordResetCode(email: string, code: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new AppError("Invalid email or code", 400);
  }
  await verificationService.checkCode(user.id, "PASSWORD_RESET", code);
}

export async function resetPassword(email: string, code: string, newPassword: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new AppError("Invalid email or code", 400);
  }

  await verificationService.consumeCode(user.id, "PASSWORD_RESET", code);

  const passwordHash = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

  // Resetting the password invalidates every other active session for this account.
  const activeSessions = await prisma.session.findMany({
    where: { userId: user.id, revokedAt: null },
  });

  await prisma.session.updateMany({
    where: { userId: user.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  await Promise.all(
    activeSessions.map((session) => {
      const remainingTtlSeconds = Math.max(1, Math.floor((session.expiresAt.getTime() - Date.now()) / 1000));
      return redis.set(REDIS_KEYS.revokedSession(session.id), "1", "EX", remainingTtlSeconds).catch(() => null);
    })
  );
}

export async function refresh(cookieValue: string, context: RequestContext): Promise<AuthResult> {
  const unpacked = unpackRefreshCookie(cookieValue);
  if (!unpacked) {
    throw new AppError("Invalid refresh token", 401);
  }

  const session = await prisma.session.findUnique({ where: { id: unpacked.sessionId } });
  if (!session || session.revokedAt || session.expiresAt < new Date()) {
    throw new AppError("Session is no longer valid", 401);
  }

  const isRevoked = await redis.get(REDIS_KEYS.revokedSession(session.id)).catch(() => null);
  if (isRevoked) {
    throw new AppError("Session has been revoked", 401);
  }

  const tokenMatches = await compareRefreshToken(unpacked.rawToken, session.refreshTokenHash);
  if (!tokenMatches) {
    throw new AppError("Invalid refresh token", 401);
  }

  // Rotate: revoke the old session, issue a brand new one.
  await prisma.session.update({ where: { id: session.id }, data: { revokedAt: new Date() } });

  return buildAuthResult(session.userId, context);
}

export async function logout(cookieValue: string): Promise<void> {
  const unpacked = unpackRefreshCookie(cookieValue);
  if (!unpacked) return;

  const session = await prisma.session.findUnique({ where: { id: unpacked.sessionId } });
  if (!session) return;

  await prisma.session.update({ where: { id: session.id }, data: { revokedAt: new Date() } });

  const remainingTtlSeconds = Math.max(1, Math.floor((session.expiresAt.getTime() - Date.now()) / 1000));
  await redis.set(REDIS_KEYS.revokedSession(session.id), "1", "EX", remainingTtlSeconds).catch(() => null);
}
