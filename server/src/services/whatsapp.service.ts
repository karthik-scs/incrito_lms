import { prisma } from "../lib/prisma";
import { AppError } from "../utils/AppError";

type SettingsInput = Partial<{
  enabled: boolean;
  apiProvider: string;
  phoneNumberId: string;
  businessAccountId: string;
  accessToken: string;
  webhookVerifyToken: string;
  classReminderEnabled: boolean;
  deadlineReminderEnabled: boolean;
  enrollmentEnabled: boolean;
  announcementEnabled: boolean;
  certificateIssuedEnabled: boolean;
}>;

async function getOrCreateSingleton() {
  const existing = await prisma.whatsAppSetting.findFirst();
  if (existing) return existing;
  return prisma.whatsAppSetting.create({ data: {} });
}

export async function getSettings() {
  return getOrCreateSingleton();
}

export async function updateSettings(data: SettingsInput) {
  const settings = await getOrCreateSingleton();
  return prisma.whatsAppSetting.update({ where: { id: settings.id }, data });
}

type TemplateInput = {
  name: string;
  category: string;
  language: string;
  messageType: "TEXT" | "MEDIA" | "DOCUMENT";
  bodyText: string;
  sampleMediaUrl?: string;
};

export function listTemplates() {
  return prisma.whatsAppTemplate.findMany({ orderBy: { createdAt: "desc" } });
}

export async function createTemplate(data: TemplateInput) {
  const existing = await prisma.whatsAppTemplate.findUnique({ where: { name: data.name } });
  if (existing) {
    throw new AppError("A template with this name already exists", 409);
  }
  return prisma.whatsAppTemplate.create({ data });
}

async function getTemplate(id: string) {
  const template = await prisma.whatsAppTemplate.findUnique({ where: { id } });
  if (!template) {
    throw new AppError("Template not found", 404);
  }
  return template;
}

/** Editing an approved template's content invalidates the approval — resets it to DRAFT for re-review. */
export async function updateTemplate(id: string, data: Partial<TemplateInput>) {
  await getTemplate(id);
  return prisma.whatsAppTemplate.update({ where: { id }, data: { ...data, status: "DRAFT" } });
}

export async function updateTemplateStatus(
  id: string,
  status: "DRAFT" | "PENDING_REVIEW" | "APPROVED" | "REJECTED"
) {
  await getTemplate(id);
  return prisma.whatsAppTemplate.update({ where: { id }, data: { status } });
}

export async function deleteTemplate(id: string) {
  await getTemplate(id);
  await prisma.whatsAppTemplate.delete({ where: { id } });
}
