import { prisma } from "../lib/prisma";
import { AppError } from "../utils/AppError";

export function listPlanSettings() {
  return prisma.planSetting.findMany({ orderBy: { plan: "asc" } });
}

export async function createPlanSetting(data: {
  plan: string;
  displayName: string;
  lmsAccessDurationValue: number;
  lmsAccessDurationUnit: "DAYS" | "MONTHS" | "YEARS";
  recordingAccessDurationValue: number;
  recordingAccessDurationUnit: "DAYS" | "MONTHS" | "YEARS";
  canAccess1on1Calls?: boolean;
  mentorCallLimitPerMonth?: number | null;
  studentCallLimitPerMonth?: number | null;
  canDownloadResources?: boolean;
  canAccessRecordings?: boolean;
  canAccessCommunity?: boolean;
}) {
  const existing = await prisma.planSetting.findUnique({ where: { plan: data.plan } });
  if (existing) throw new AppError("A plan with this key already exists", 409);
  return prisma.planSetting.create({ data });
}

export async function updatePlanSetting(
  plan: string,
  data: {
    displayName?: string;
    lmsAccessDurationValue?: number;
    lmsAccessDurationUnit?: "DAYS" | "MONTHS" | "YEARS";
    recordingAccessDurationValue?: number;
    recordingAccessDurationUnit?: "DAYS" | "MONTHS" | "YEARS";
    canAccess1on1Calls?: boolean;
    mentorCallLimitPerMonth?: number | null;
    studentCallLimitPerMonth?: number | null;
    canDownloadResources?: boolean;
    canAccessRecordings?: boolean;
    canAccessCommunity?: boolean;
  }
) {
  const existing = await prisma.planSetting.findUnique({ where: { plan } });
  if (!existing) throw new AppError("Plan setting not found", 404);
  return prisma.planSetting.update({ where: { plan }, data });
}

export async function deletePlanSetting(plan: string) {
  const existing = await prisma.planSetting.findUnique({ where: { plan } });
  if (!existing) throw new AppError("Plan setting not found", 404);
  const enrollmentCount = await prisma.enrollment.count({ where: { plan } });
  if (enrollmentCount > 0) {
    throw new AppError(`Cannot delete plan "${plan}" — ${enrollmentCount} enrollment(s) reference it`, 409);
  }
  return prisma.planSetting.delete({ where: { plan } });
}
