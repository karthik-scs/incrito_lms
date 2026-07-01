-- CreateEnum
CREATE TYPE "CertificateScope" AS ENUM ('COURSE', 'MODULES');

-- CreateTable
CREATE TABLE "CourseCertificate" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "scope" "CertificateScope" NOT NULL DEFAULT 'COURSE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CourseCertificate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseCertificateModule" (
    "courseCertificateId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,

    CONSTRAINT "CourseCertificateModule_pkey" PRIMARY KEY ("courseCertificateId","moduleId")
);

-- CreateIndex
CREATE INDEX "CourseCertificate_courseId_idx" ON "CourseCertificate"("courseId");

-- CreateIndex
CREATE INDEX "CourseCertificate_templateId_idx" ON "CourseCertificate"("templateId");

-- AddForeignKey
ALTER TABLE "CourseCertificate" ADD CONSTRAINT "CourseCertificate_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseCertificate" ADD CONSTRAINT "CourseCertificate_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "CertificateTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseCertificateModule" ADD CONSTRAINT "CourseCertificateModule_courseCertificateId_fkey" FOREIGN KEY ("courseCertificateId") REFERENCES "CourseCertificate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseCertificateModule" ADD CONSTRAINT "CourseCertificateModule_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DataMigration: one default COURSE-scope CourseCertificate per course that already had a single
-- certificateTemplateId assigned, before that column gets dropped below.
INSERT INTO "CourseCertificate" ("id", "courseId", "templateId", "title", "scope")
SELECT 'coursecert_' || "id", "id", "certificateTemplateId", 'Course Completion Certificate', 'COURSE'
FROM "Course"
WHERE "certificateTemplateId" IS NOT NULL;

-- AlterTable
ALTER TABLE "Certificate" ADD COLUMN "courseCertificateId" TEXT;

-- DataMigration: point every existing certificate at its course's new default allocation.
UPDATE "Certificate" c
SET "courseCertificateId" = cc."id"
FROM "CourseCertificate" cc
JOIN "Cohort" ch ON ch."courseId" = cc."courseId"
WHERE ch."id" = c."cohortId";

-- AlterTable
ALTER TABLE "Certificate" ALTER COLUMN "courseCertificateId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_courseCertificateId_fkey" FOREIGN KEY ("courseCertificateId") REFERENCES "CourseCertificate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- DropIndex
DROP INDEX "Certificate_userId_cohortId_key";

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_userId_cohortId_courseCertificateId_key" ON "Certificate"("userId", "cohortId", "courseCertificateId");

-- DropForeignKey
ALTER TABLE "Course" DROP CONSTRAINT "Course_certificateTemplateId_fkey";

-- DropIndex
DROP INDEX "Course_certificateTemplateId_idx";

-- AlterTable
ALTER TABLE "Course" DROP COLUMN "certificateTemplateId";
