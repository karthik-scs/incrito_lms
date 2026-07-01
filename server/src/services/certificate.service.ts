import crypto from "node:crypto";
import { prisma } from "../lib/prisma";
import { AppError } from "../utils/AppError";
import { notifyUser } from "./notification.service";

const certificateInclude = {
  cohort: { include: { course: true } },
  courseCertificate: { include: { template: true } },
  template: true,
} as const;

export function listMyCertificates(userId: string) {
  return prisma.certificate.findMany({
    where: { userId },
    include: certificateInclude,
    orderBy: { issuedAt: "desc" },
  });
}

/** A course's lessons grouped under a specific set of modules — used for MODULES-scope certificates. */
async function computeModuleSetCompletion(userId: string, moduleIds: string[]) {
  if (moduleIds.length === 0) return { completed: false, totalLessons: 0, completedLessons: 0 };

  const lessons = await prisma.lesson.findMany({ where: { moduleId: { in: moduleIds } }, select: { id: true } });
  const lessonIds = lessons.map((l) => l.id);
  if (lessonIds.length === 0) return { completed: false, totalLessons: 0, completedLessons: 0 };

  const completedLessons = await prisma.lessonProgress.count({
    where: { userId, lessonId: { in: lessonIds }, completed: true },
  });
  return { completed: completedLessons === lessonIds.length, totalLessons: lessonIds.length, completedLessons };
}

/**
 * Every certificate allocated to this cohort's course, each with its own eligibility check
 * (whole-course completion, or completion of specific modules) and its own issued-or-not state —
 * a course can have more than one certificate to unlock, not just one.
 */
export async function getEligibilityList(userId: string, cohortId: string) {
  const enrollment = await prisma.enrollment.findUnique({ where: { userId_cohortId: { userId, cohortId } } });
  if (!enrollment) {
    throw new AppError("You are not enrolled in this cohort", 403);
  }

  const cohort = await prisma.cohort.findUniqueOrThrow({ where: { id: cohortId } });
  const courseCertificates = await prisma.courseCertificate.findMany({
    where: { courseId: cohort.courseId },
    include: { template: true, requiredModules: { include: { module: { select: { id: true, title: true } } } } },
    orderBy: { createdAt: "asc" },
  });

  const progress = await prisma.progress.findUnique({ where: { userId_cohortId: { userId, cohortId } } });

  return Promise.all(
    courseCertificates.map(async (courseCertificate) => {
      const existing = await prisma.certificate.findUnique({
        where: { userId_cohortId_courseCertificateId: { userId, cohortId, courseCertificateId: courseCertificate.id } },
        include: certificateInclude,
      });

      const planEligible = courseCertificate.planAccess === "BOTH" || courseCertificate.planAccess === enrollment.plan;

      if (courseCertificate.scope === "COURSE") {
        const completionPercentage = progress?.completionPercentage ?? 0;
        return {
          courseCertificate,
          eligible: planEligible && completionPercentage >= 100,
          progressLabel: planEligible
            ? `${completionPercentage}% complete`
            : `Requires ${courseCertificate.planAccess === "INTENSIVE_PRO" ? "Intensive Pro" : "ICAP"} plan`,
          certificate: existing,
        };
      }

      const moduleIds = courseCertificate.requiredModules.map((m) => m.moduleId);
      const moduleProgress = await computeModuleSetCompletion(userId, moduleIds);
      return {
        courseCertificate,
        eligible: planEligible && moduleProgress.completed,
        progressLabel: planEligible
          ? `${moduleProgress.completedLessons}/${moduleProgress.totalLessons} lessons in required modules`
          : `Requires ${courseCertificate.planAccess === "INTENSIVE_PRO" ? "Intensive Pro" : "ICAP"} plan`,
        certificate: existing,
      };
    })
  );
}

export async function issueCertificate(userId: string, cohortId: string, courseCertificateId: string) {
  const eligibilityList = await getEligibilityList(userId, cohortId);
  const match = eligibilityList.find((r) => r.courseCertificate.id === courseCertificateId);
  if (!match) {
    throw new AppError("This certificate isn't allocated to this course", 404);
  }
  if (match.certificate) {
    return match.certificate;
  }
  if (!match.eligible) {
    throw new AppError("Requirements not met yet — this certificate is still locked", 403);
  }

  const cohort = await prisma.cohort.findUniqueOrThrow({ where: { id: cohortId }, include: { course: true } });

  const certificateNumber = `CERT-${new Date().getFullYear()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
  const verificationToken = crypto.randomBytes(16).toString("hex");

  const certificate = await prisma.certificate.create({
    data: {
      userId,
      cohortId,
      courseCertificateId,
      templateId: match.courseCertificate.templateId,
      certificateNumber,
      verificationToken,
    },
    include: certificateInclude,
  });

  await notifyUser(
    userId,
    "CERTIFICATE_ISSUED",
    "Certificate issued!",
    `Your certificate "${match.courseCertificate.title}" for "${cohort.course.title}" is ready.`,
    { cohortId, certificateId: certificate.id, courseSlug: cohort.course.slug, action: "view_certificate" }
  ).catch(() => null);

  return certificate;
}

export function verifyCertificate(verificationToken: string) {
  return prisma.certificate.findUnique({
    where: { verificationToken },
    include: {
      user: { select: { firstName: true, lastName: true } },
      cohort: { include: { course: { select: { title: true } } } },
      courseCertificate: { include: { template: true } },
      template: true,
    },
  });
}
