import { prisma } from "../lib/prisma";
import { sendEmail } from "../lib/email";
import { env } from "../config/env";
import { AppError } from "../utils/AppError";
import type { VerificationPurpose } from "../../../app/generated/prisma/client";

const TTL_SECONDS_BY_PURPOSE: Record<VerificationPurpose, number> = {
  EMAIL_VERIFICATION: env.EMAIL_VERIFICATION_TTL_SECONDS,
  PASSWORD_RESET: env.PASSWORD_RESET_TTL_SECONDS,
};

const MAX_ATTEMPTS = 5;

function generateOtp(): string {
  // OTP_STATIC_CODE lets dev/test environments skip real email by fixing the code.
  // In production it should be unset so every request gets a unique code.
  if (env.OTP_STATIC_CODE) return env.OTP_STATIC_CODE;
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function buildEmailHtml(purpose: VerificationPurpose, code: string, ttlMinutes: number): { subject: string; html: string; text: string } {
  const isReset = purpose === "PASSWORD_RESET";

  const subject = isReset ? "Reset your Incrito LMS password" : "Verify your Incrito LMS email";

  const heading = isReset ? "Password Reset" : "Email Verification";
  const body = isReset
    ? "We received a request to reset your password. Use the code below to continue. If you didn't make this request, you can safely ignore this email."
    : "Thank you for signing up. Use the code below to verify your email address and activate your account.";

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 0;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
        <tr>
          <td style="background:#4f46e5;padding:28px 32px;">
            <p style="margin:0;color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.3px;">Incrito LMS</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#111827;">${heading}</h1>
            <p style="margin:0 0 28px;font-size:15px;color:#6b7280;line-height:1.6;">${body}</p>

            <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:20px;text-align:center;margin-bottom:28px;">
              <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:1px;">Your ${isReset ? "reset" : "verification"} code</p>
              <p style="margin:0;font-size:40px;font-weight:700;color:#4f46e5;letter-spacing:10px;font-family:'Courier New',monospace;">${code}</p>
            </div>

            <p style="margin:0 0 8px;font-size:13px;color:#9ca3af;">
              This code expires in <strong>${ttlMinutes} minutes</strong>.
              ${isReset ? "Once used, the code cannot be reused." : "If you didn't create an account, no action is needed."}
            </p>
            <p style="margin:0;font-size:12px;color:#d1d5db;">Please do not share this code with anyone.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #f3f4f6;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">© ${new Date().getFullYear()} Incrito LMS. All rights reserved.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();

  const text = `${heading}\n\nYour code: ${code}\n\nThis code expires in ${ttlMinutes} minutes.\n\n${body}`;

  return { subject, html, text };
}

export async function issueCode(userId: string, purpose: VerificationPurpose) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  if (!user) throw new AppError("User not found", 404);

  const code = generateOtp();
  const ttlSeconds = TTL_SECONDS_BY_PURPOSE[purpose];
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

  // Invalidate any previous active code for the same purpose
  await prisma.verificationCode.updateMany({
    where: { userId, purpose, consumedAt: null },
    data: { consumedAt: new Date() },
  });

  await prisma.verificationCode.create({
    data: { userId, purpose, code, expiresAt },
  });

  const ttlMinutes = Math.round(ttlSeconds / 60);
  const { subject, html, text } = buildEmailHtml(purpose, code, ttlMinutes);

  await sendEmail({ to: user.email, subject, html, text });

  return { expiresAt };
}

async function findValidRecord(userId: string, purpose: VerificationPurpose, submittedCode: string) {
  const record = await prisma.verificationCode.findFirst({
    where: { userId, purpose, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });

  if (!record) {
    throw new AppError("No active code for this request. Please request a new one.", 400);
  }

  if (record.expiresAt < new Date()) {
    throw new AppError("This code has expired. Please request a new one.", 400);
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    throw new AppError("Too many incorrect attempts. Please request a new code.", 429);
  }

  if (record.code !== submittedCode) {
    await prisma.verificationCode.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });
    throw new AppError("Incorrect code", 400);
  }

  return record;
}

/** Validates the code and marks it consumed — for one-shot actions (email verification, final password reset). */
export async function consumeCode(userId: string, purpose: VerificationPurpose, submittedCode: string) {
  const record = await findValidRecord(userId, purpose, submittedCode);
  await prisma.verificationCode.update({ where: { id: record.id }, data: { consumedAt: new Date() } });
}

/** Validates the code WITHOUT consuming it — for a standalone "Verify OTP" step before a later action. */
export async function checkCode(userId: string, purpose: VerificationPurpose, submittedCode: string) {
  await findValidRecord(userId, purpose, submittedCode);
}
