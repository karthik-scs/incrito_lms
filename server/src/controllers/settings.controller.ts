import type { Request, Response } from "express";
import { success } from "../utils/apiResponse";
import { AppError } from "../utils/AppError";
import * as settingsService from "../services/settings.service";
import { sendTestEmail } from "../lib/email";

function redact(settings: Awaited<ReturnType<typeof settingsService.getSettings>>) {
  const { smtpPassword, ...rest } = settings;
  return { ...rest, smtpPasswordSet: Boolean(smtpPassword) };
}

export async function get(_req: Request, res: Response) {
  const settings = await settingsService.getSettings();
  return success(res, redact(settings));
}

export async function update(req: Request, res: Response) {
  const settings = await settingsService.updateSettings(req.body);
  return success(res, redact(settings));
}

export async function testEmail(req: Request, res: Response) {
  let toEmail: string | undefined = req.body?.email;
  if (!toEmail) {
    const user = await import("../lib/prisma").then(({ prisma }) =>
      prisma.user.findUnique({ where: { id: req.user!.id }, select: { email: true } })
    );
    toEmail = user?.email;
  }
  if (!toEmail) throw new AppError("Provide an email address to send the test to", 422);
  await sendTestEmail(toEmail);
  return success(res, { sent: true, to: toEmail });
}
