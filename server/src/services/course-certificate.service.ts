import { prisma } from "../lib/prisma";
import { AppError } from "../utils/AppError";

const include = {
  template: true,
  requiredModules: { include: { module: { select: { id: true, title: true } } } },
  _count: { select: { certificates: true } },
} as const;

export function listCourseCertificates(courseId: string) {
  return prisma.courseCertificate.findMany({ where: { courseId }, include, orderBy: { createdAt: "asc" } });
}

type CourseCertificateInput = {
  courseId: string;
  templateId: string;
  title: string;
  scope: "COURSE" | "MODULES";
  moduleIds?: string[];
  planAccess?: "ICAP" | "INTENSIVE_PRO" | "BOTH";
};

export async function createCourseCertificate(data: CourseCertificateInput) {
  const course = await prisma.course.findUnique({ where: { id: data.courseId } });
  if (!course) {
    throw new AppError("Course not found", 404);
  }
  if (data.scope === "MODULES" && (!data.moduleIds || data.moduleIds.length === 0)) {
    throw new AppError("Select at least one module for a module-scoped certificate", 422);
  }

  return prisma.courseCertificate.create({
    data: {
      courseId: data.courseId,
      templateId: data.templateId,
      title: data.title,
      scope: data.scope,
      planAccess: data.planAccess ?? "BOTH",
      requiredModules:
        data.scope === "MODULES" && data.moduleIds ? { create: data.moduleIds.map((moduleId) => ({ moduleId })) } : undefined,
    },
    include,
  });
}

async function getCourseCertificateOrThrow(id: string) {
  const courseCertificate = await prisma.courseCertificate.findUnique({ where: { id } });
  if (!courseCertificate) {
    throw new AppError("Certificate allocation not found", 404);
  }
  return courseCertificate;
}

export async function updateCourseCertificate(id: string, data: Partial<Omit<CourseCertificateInput, "courseId">>) {
  await getCourseCertificateOrThrow(id);
  const { moduleIds, ...fields } = data;

  if (moduleIds) {
    await prisma.courseCertificateModule.deleteMany({ where: { courseCertificateId: id } });
  }

  return prisma.courseCertificate.update({
    where: { id },
    data: {
      ...fields,
      requiredModules: moduleIds ? { create: moduleIds.map((moduleId) => ({ moduleId })) } : undefined,
    },
    include,
  });
}

export async function deleteCourseCertificate(id: string) {
  const courseCertificate = await getCourseCertificateOrThrow(id);
  const issuedCount = await prisma.certificate.count({ where: { courseCertificateId: id } });
  if (issuedCount > 0) {
    throw new AppError(
      `${issuedCount} certificate(s) have already been issued for "${courseCertificate.title}" — remove those first if you really want to delete this allocation.`,
      409
    );
  }
  await prisma.courseCertificate.delete({ where: { id } });
}
