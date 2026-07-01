import nodemailer from "nodemailer";
import { prisma } from "./prisma";
import { AppError } from "../utils/AppError";

export type EmailOptions = { to: string; subject: string; html: string; text?: string };

/** Reads SMTP config from PlatformSetting (DB), falls back to nothing — same pattern as S3/Zoho credentials. */
async function getTransporter() {
  const settings = await prisma.platformSetting.findFirst();
  const host = settings?.smtpHost;
  const port = settings?.smtpPort ?? 587;
  const user = settings?.smtpUsername;
  const pass = settings?.smtpPassword;
  const secure = settings?.smtpSecure ?? true;

  if (!host || !user || !pass) {
    throw new AppError("SMTP is not configured — set host, username and password in Admin → Settings → Email.", 500);
  }

  return {
    transporter: nodemailer.createTransport({ host, port, secure: port === 465 ? true : false, auth: { user, pass }, tls: { rejectUnauthorized: false } }),
    from: settings?.smtpFromEmail ? `${settings.smtpFromName ?? "Incrito LMS"} <${settings.smtpFromEmail}>` : user,
  };
}

export async function sendEmail(options: EmailOptions) {
  const { transporter, from } = await getTransporter();
  await transporter.sendMail({ from, to: options.to, subject: options.subject, html: options.html, text: options.text });
}

export async function sendTestEmail(toEmail: string) {
  const { transporter, from } = await getTransporter();
  await transporter.verify();
  await transporter.sendMail({
    from,
    to: toEmail,
    subject: "Incrito LMS — SMTP test email",
    html: `<div style="font-family:sans-serif;padding:24px"><h2>SMTP is working ✓</h2><p>This test email was sent from <strong>Incrito LMS</strong> to confirm your SMTP settings are correct.</p><p style="color:#666;font-size:13px">Sent at ${new Date().toLocaleString()}</p></div>`,
    text: "SMTP is working. This test email was sent from Incrito LMS.",
  });
}
