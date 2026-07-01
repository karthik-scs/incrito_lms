import { prisma } from "../lib/prisma";
import { AppError } from "../utils/AppError";

type ZoomAccountInput = Partial<{
  label: string;
  zoomAccountId: string;
  clientId: string;
  clientSecret: string;
  secretToken: string;
  sdkKey: string;
  sdkSecret: string;
  concurrentLimit: number;
  isActive: boolean;
}>;

export function listZoomAccounts() {
  return prisma.zoomAccount.findMany({ orderBy: { createdAt: "asc" } });
}

export function createZoomAccount(data: ZoomAccountInput) {
  return prisma.zoomAccount.create({
    data: {
      label: data.label!,
      zoomAccountId: data.zoomAccountId!,
      clientId: data.clientId!,
      clientSecret: data.clientSecret!,
      secretToken: data.secretToken!,
      sdkKey: data.sdkKey,
      sdkSecret: data.sdkSecret,
      concurrentLimit: data.concurrentLimit,
      isActive: data.isActive,
    },
  });
}

async function getZoomAccountOrThrow(id: string) {
  const account = await prisma.zoomAccount.findUnique({ where: { id } });
  if (!account) {
    throw new AppError("Zoom account not found", 404);
  }
  return account;
}

export async function updateZoomAccount(id: string, data: ZoomAccountInput) {
  await getZoomAccountOrThrow(id);
  return prisma.zoomAccount.update({ where: { id }, data });
}

export async function deleteZoomAccount(id: string) {
  await getZoomAccountOrThrow(id);
  await prisma.zoomAccount.delete({ where: { id } });
}
