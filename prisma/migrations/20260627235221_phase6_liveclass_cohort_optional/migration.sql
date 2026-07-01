-- DropForeignKey
ALTER TABLE "LiveClass" DROP CONSTRAINT "LiveClass_cohortId_fkey";

-- AlterTable
ALTER TABLE "LiveClass" ALTER COLUMN "cohortId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "LiveClass" ADD CONSTRAINT "LiveClass_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "Cohort"("id") ON DELETE SET NULL ON UPDATE CASCADE;
