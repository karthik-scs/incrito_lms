-- CreateEnum
CREATE TYPE "AssessmentKind" AS ENUM ('QUIZ', 'ASSESSMENT');

-- AlterTable
ALTER TABLE "Assessment" ADD COLUMN     "kind" "AssessmentKind" NOT NULL DEFAULT 'QUIZ',
ADD COLUMN     "lessonId" TEXT,
ADD COLUMN     "moduleId" TEXT;

-- AlterTable
ALTER TABLE "LiveClass" ADD COLUMN     "hostStartUrl" TEXT,
ADD COLUMN     "zoomPasscode" TEXT;

-- CreateIndex
CREATE INDEX "Assessment_moduleId_idx" ON "Assessment"("moduleId");

-- CreateIndex
CREATE INDEX "Assessment_lessonId_idx" ON "Assessment"("lessonId");

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;
