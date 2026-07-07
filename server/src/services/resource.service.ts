import { prisma } from "../lib/prisma";
import { AppError } from "../utils/AppError";
import { getPresignedGetUrl } from "../lib/s3";

const RESOURCE_STAFF_ROLES = ["Admin", "Mentor", "Cohort Manager"];

export function listResources(lessonId: string) {
  return prisma.resource.findMany({ where: { lessonId }, orderBy: { createdAt: "asc" } });
}

export async function createResource(data: { lessonId: string; title: string; fileUrl: string; fileType: string }) {
  const lesson = await prisma.lesson.findUnique({ where: { id: data.lessonId } });
  if (!lesson) {
    throw new AppError("Lesson not found", 404);
  }
  return prisma.resource.create({ data });
}

async function getResource(id: string) {
  const resource = await prisma.resource.findUnique({ where: { id } });
  if (!resource) {
    throw new AppError("Resource not found", 404);
  }
  return resource;
}

export async function updateResource(id: string, data: Partial<{ title: string; fileUrl: string; fileType: string }>) {
  await getResource(id);
  return prisma.resource.update({ where: { id }, data });
}

export async function deleteResource(id: string) {
  await getResource(id);
  await prisma.resource.delete({ where: { id } });
}

/** Same protection model as lesson recordings/content — never expose the raw S3 key, only a short-lived signed URL, gated by plan-lock + cohort enrollment. */
export async function getResourceSignedUrl(resourceId: string, userId: string) {
  const resource = await prisma.resource.findUnique({
    where: { id: resourceId },
    include: { lesson: { include: { module: true } } },
  });
  if (!resource) {
    throw new AppError("Resource not found", 404);
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, include: { role: true } });
  const isStaff = RESOURCE_STAFF_ROLES.includes(user?.role.name ?? "");

  if (!isStaff) {
    const { lesson } = resource;
    const enrollment = await prisma.enrollment.findFirst({
      where: { userId, cohortId: lesson.module.cohortId },
    });
    if (!enrollment) {
      throw new AppError("You don't have access to this resource", 403);
    }
    const isLockedFor = (planAccess: string) => planAccess !== "BOTH" && planAccess !== enrollment.plan;
    if (isLockedFor(lesson.module.planAccess) || isLockedFor(lesson.planAccess)) {
      throw new AppError("This resource is part of the Intensive Pro plan", 403);
    }
  }

  // `fileUrl` is stored as the full `${PUBLIC_API_URL}/api/files/<key>` redirect URL (see
  // upload.controller.ts#persist), not a bare key — extract just the key for signing.
  const key = resource.fileUrl.split("/api/files/")[1];
  if (!key) {
    throw new AppError("This resource isn't an uploaded file", 422);
  }
  return getPresignedGetUrl(key);
}
