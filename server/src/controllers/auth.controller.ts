import type { Request, Response } from "express";
import { env } from "../config/env";
import { success } from "../utils/apiResponse";
import { AppError } from "../utils/AppError";
import { uploadObject, buildS3Key, deleteObject, keyFromUrl } from "../lib/s3";
import { extensionFor } from "../lib/uploads";
import * as authService from "../services/auth.service";
import * as mfaService from "../services/mfa.service";
import { verifyMfaPendingToken } from "../services/token.service";

export async function uploadAvatar(req: Request, res: Response) {
  if (!req.file) {
    throw new AppError("No avatar file was uploaded", 422);
  }
  const existing = await authService.getCurrentUser(req.user!.id);
  const oldKey = keyFromUrl(existing?.avatarUrl);
  const key = buildS3Key("avatars", req.user!.id, extensionFor(req.file.mimetype));
  await uploadObject(key, req.file.buffer, req.file.mimetype);
  if (oldKey) await deleteObject(oldKey);
  const avatarUrl = `${env.PUBLIC_API_URL}/api/files/${key}`;
  const user = await authService.updateAvatar(req.user!.id, avatarUrl);
  return success(res, user);
}

const REFRESH_COOKIE_NAME = "refresh_token";

function setRefreshCookie(res: Response, value: string, expiresAt: Date) {
  res.cookie(REFRESH_COOKIE_NAME, value, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "strict",
    expires: expiresAt,
    path: "/api/auth",
  });
}

function requestContext(req: Request) {
  return { userAgent: req.headers["user-agent"], ipAddress: req.ip };
}

export async function signup(req: Request, res: Response) {
  const result = await authService.signup(req.body);
  return success(res, result, 201);
}

export async function verifyEmail(req: Request, res: Response) {
  const result = await authService.verifyEmail(req.body.email, req.body.code, requestContext(req));
  setRefreshCookie(res, result.refreshCookie, result.refreshTokenExpiresAt);
  return success(res, { user: result.user, accessToken: result.accessToken });
}

export async function resendVerification(req: Request, res: Response) {
  await authService.resendVerification(req.body.email);
  return success(res, { sent: true });
}

export async function requestPasswordReset(req: Request, res: Response) {
  await authService.requestPasswordReset(req.body.email);
  return success(res, { sent: true });
}

export async function resetPassword(req: Request, res: Response) {
  await authService.resetPassword(req.body.email, req.body.code, req.body.password);
  return success(res, { reset: true });
}

export async function checkPasswordResetCode(req: Request, res: Response) {
  await authService.checkPasswordResetCode(req.body.email, req.body.code);
  return success(res, { valid: true });
}

export async function login(req: Request, res: Response) {
  const result = await authService.login(req.body, requestContext(req));
  if ("mfaRequired" in result) {
    return success(res, { mfaRequired: true, mfaToken: result.mfaToken });
  }
  setRefreshCookie(res, result.refreshCookie, result.refreshTokenExpiresAt);
  return success(res, { user: result.user, accessToken: result.accessToken });
}

export async function mfaChallenge(req: Request, res: Response) {
  const { mfaToken, code } = req.body as { mfaToken: string; code: string };
  let userId: string;
  try {
    userId = verifyMfaPendingToken(mfaToken);
  } catch {
    throw new AppError("MFA session expired — please sign in again", 401);
  }
  await mfaService.verifyChallenge(userId, code);
  const result = await authService.buildAuthResult(userId, requestContext(req));
  setRefreshCookie(res, result.refreshCookie, result.refreshTokenExpiresAt);
  return success(res, { user: result.user, accessToken: result.accessToken });
}

export async function mfaSetup(req: Request, res: Response) {
  const data = await mfaService.startSetup(req.user!.id);
  return success(res, data);
}

export async function mfaActivate(req: Request, res: Response) {
  await mfaService.activate(req.user!.id, req.body.code);
  return success(res, { mfaEnabled: true });
}

export async function mfaDisable(req: Request, res: Response) {
  await mfaService.disable(req.user!.id, req.body.code);
  return success(res, { mfaEnabled: false });
}

export async function refresh(req: Request, res: Response) {
  const cookieValue = req.cookies?.[REFRESH_COOKIE_NAME];
  if (!cookieValue) {
    throw new AppError("No refresh token provided", 401);
  }

  const result = await authService.refresh(cookieValue, requestContext(req));
  setRefreshCookie(res, result.refreshCookie, result.refreshTokenExpiresAt);
  return success(res, { user: result.user, accessToken: result.accessToken });
}

export async function me(req: Request, res: Response) {
  const user = await authService.getCurrentUser(req.user!.id);
  return success(res, { user });
}

export async function updateProfile(req: Request, res: Response) {
  const user = await authService.updateProfile(req.user!.id, req.body);
  return success(res, user);
}

export async function changePassword(req: Request, res: Response) {
  await authService.changePassword(req.user!.id, req.body.currentPassword, req.body.newPassword);
  return success(res, { changed: true });
}

export async function listSessions(req: Request, res: Response) {
  const sessions = await authService.listSessions(req.user!.id, req.user!.sessionId);
  return success(res, sessions);
}

export async function revokeSession(req: Request, res: Response) {
  await authService.revokeSession(req.user!.id, String(req.params.sessionId));
  return success(res, { revoked: true });
}

export async function logout(req: Request, res: Response) {
  const cookieValue = req.cookies?.[REFRESH_COOKIE_NAME];
  if (cookieValue) {
    await authService.logout(cookieValue);
  }
  res.clearCookie(REFRESH_COOKIE_NAME, { path: "/api/auth" });
  return success(res, { loggedOut: true });
}
