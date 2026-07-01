import { prisma } from "../lib/prisma";

type PreferenceInput = Partial<{
  emailEnabled: boolean;
  enrollmentEmails: boolean;
  announcementEmails: boolean;
  certificateEmails: boolean;
  productUpdateEmails: boolean;
}>;

export async function getPreferences(userId: string) {
  return prisma.notificationPreference.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
}

export async function updatePreferences(userId: string, data: PreferenceInput) {
  return prisma.notificationPreference.upsert({
    where: { userId },
    update: data,
    create: { userId, ...data },
  });
}
