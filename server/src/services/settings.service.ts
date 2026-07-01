import { prisma } from "../lib/prisma";

type SettingsInput = Partial<{
  platformName: string;
  maintenanceMode: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpUsername: string;
  smtpPassword: string;
  smtpFromName: string;
  smtpFromEmail: string;
  smtpSecure: boolean;
  sessionTimeoutMinutes: number;
  maxLoginAttempts: number;
  enforceTwoFactor: boolean;
  maxDevicesPerUser: number;
  supportEmail: string;
  supportPhone: string;
  supportCallStart: string;
  supportCallEnd: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supportFaqs: any;
}>;

/** The platform has exactly one settings record, created lazily on first read. */
async function getOrCreateSingleton() {
  const existing = await prisma.platformSetting.findFirst();
  if (existing) return existing;
  return prisma.platformSetting.create({ data: {} });
}

export async function getSettings() {
  return getOrCreateSingleton();
}

export async function updateSettings(data: SettingsInput) {
  const settings = await getOrCreateSingleton();
  return prisma.platformSetting.update({ where: { id: settings.id }, data });
}
