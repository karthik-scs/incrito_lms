import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { env } from "../config/env";
import type { AuthUser } from "../types/api";

type AccessTokenPayload = {
  sub: string;
  sid: string;
  roleId: string;
  roleName: string;
  permissions: string[];
};

export function signAccessToken(user: AuthUser): string {
  const payload: AccessTokenPayload = {
    sub: user.id,
    sid: user.sessionId,
    roleId: user.roleId,
    roleName: user.roleName,
    permissions: user.permissions,
  };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: env.ACCESS_TOKEN_TTL_SECONDS });
}

export function verifyAccessToken(token: string): AuthUser {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
  return {
    id: decoded.sub,
    sessionId: decoded.sid,
    roleId: decoded.roleId,
    roleName: decoded.roleName,
    permissions: decoded.permissions,
  };
}

export function generateRefreshToken(): string {
  return crypto.randomBytes(64).toString("hex");
}

export async function hashRefreshToken(rawToken: string): Promise<string> {
  return bcrypt.hash(rawToken, 10);
}

export async function compareRefreshToken(rawToken: string, hash: string): Promise<boolean> {
  return bcrypt.compare(rawToken, hash);
}

/** Refresh cookie value packs the session id with the raw token for O(1) lookup. */
export function packRefreshCookie(sessionId: string, rawToken: string): string {
  return `${sessionId}.${rawToken}`;
}

/**
 * Short-lived JWT (5 min) issued when login succeeds but MFA is required.
 * Carries only the userId — the client must exchange it for full tokens via /api/auth/mfa/challenge.
 */
export function signMfaPendingToken(userId: string): string {
  return jwt.sign({ sub: userId, mfaPending: true }, env.JWT_ACCESS_SECRET, { expiresIn: 5 * 60 });
}

export function verifyMfaPendingToken(token: string): string {
  const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as { sub: string; mfaPending?: boolean };
  if (!payload.mfaPending) throw new Error("Not an MFA pending token");
  return payload.sub;
}

export function unpackRefreshCookie(cookieValue: string): { sessionId: string; rawToken: string } | null {
  const separatorIndex = cookieValue.indexOf(".");
  if (separatorIndex === -1) return null;
  return {
    sessionId: cookieValue.slice(0, separatorIndex),
    rawToken: cookieValue.slice(separatorIndex + 1),
  };
}
