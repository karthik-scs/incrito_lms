import * as OTPAuth from "otpauth";
import QRCode from "qrcode";
import { prisma } from "../lib/prisma";
import { AppError } from "../utils/AppError";

const ISSUER = "Incrito LMS";

function buildTotp(secret: OTPAuth.Secret | string, label = "") {
  return new OTPAuth.TOTP({
    issuer: ISSUER,
    label,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: typeof secret === "string" ? OTPAuth.Secret.fromBase32(secret) : secret,
  });
}

function isCodeValid(storedSecret: string, code: string): boolean {
  const totp = buildTotp(storedSecret);
  // window: 1 allows one period (30 s) drift in either direction — handles minor clock skew
  return totp.validate({ token: code.replace(/\s/g, ""), window: 1 }) !== null;
}

/** Step 1 of setup: generate a new secret, persist it (not active yet), return QR + manual key. */
export async function startSetup(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { email: true, mfaEnabled: true },
  });

  if (user.mfaEnabled) throw new AppError("MFA is already enabled on this account", 400);

  const secret = new OTPAuth.Secret({ size: 20 });
  const totp = buildTotp(secret, user.email);
  const otpAuthUrl = totp.toString();

  await prisma.user.update({ where: { id: userId }, data: { mfaSecret: secret.base32 } });

  const qrDataUrl = await QRCode.toDataURL(otpAuthUrl, { width: 240, margin: 1 });

  return { secret: secret.base32, qrDataUrl };
}

/** Step 2 of setup: verify the first code from the app, then flip mfaEnabled = true. */
export async function activate(userId: string, code: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { mfaSecret: true, mfaEnabled: true },
  });

  if (user.mfaEnabled) throw new AppError("MFA is already enabled", 400);
  if (!user.mfaSecret) throw new AppError("MFA setup not started — call /api/auth/mfa/setup first", 400);

  if (!isCodeValid(user.mfaSecret, code)) {
    throw new AppError("Invalid code — make sure your authenticator app is synced and try again", 400);
  }

  await prisma.user.update({ where: { id: userId }, data: { mfaEnabled: true } });
}

/** Disable MFA — requires a valid TOTP code as proof of possession before disabling. */
export async function disable(userId: string, code: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { mfaSecret: true, mfaEnabled: true },
  });

  if (!user.mfaEnabled || !user.mfaSecret) throw new AppError("MFA is not enabled on this account", 400);

  if (!isCodeValid(user.mfaSecret, code)) {
    throw new AppError("Invalid authenticator code", 400);
  }

  await prisma.user.update({ where: { id: userId }, data: { mfaEnabled: false, mfaSecret: null } });
}

/** Used during the login MFA challenge — verifies the TOTP code without any side effects. */
export async function verifyChallenge(userId: string, code: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { mfaSecret: true, mfaEnabled: true },
  });

  if (!user.mfaEnabled || !user.mfaSecret) throw new AppError("MFA not configured for this account", 400);

  if (!isCodeValid(user.mfaSecret, code)) {
    throw new AppError("Invalid authenticator code — please try again", 400);
  }
}
