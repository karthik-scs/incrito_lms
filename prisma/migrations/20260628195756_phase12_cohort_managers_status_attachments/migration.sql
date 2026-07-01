-- AlterEnum
BEGIN;
CREATE TYPE "CohortStatus_new" AS ENUM ('ACTIVE', 'UPCOMING', 'COMPLETED', 'CANCELLED', 'ARCHIVED');
ALTER TABLE "public"."Cohort" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Cohort" ALTER COLUMN "status" TYPE "CohortStatus_new" USING ("status"::text::"CohortStatus_new");
ALTER TYPE "CohortStatus" RENAME TO "CohortStatus_old";
ALTER TYPE "CohortStatus_new" RENAME TO "CohortStatus";
DROP TYPE "public"."CohortStatus_old";
ALTER TABLE "Cohort" ALTER COLUMN "status" SET DEFAULT 'UPCOMING';
COMMIT;

-- AlterTable
ALTER TABLE "ChatMessage" ADD COLUMN     "attachmentType" TEXT,
ADD COLUMN     "attachmentUrl" TEXT,
ALTER COLUMN "content" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Comment" ADD COLUMN     "attachmentType" TEXT,
ADD COLUMN     "attachmentUrl" TEXT;

-- CreateTable
CREATE TABLE "CohortManagerAssignment" (
    "cohortId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "CohortManagerAssignment_pkey" PRIMARY KEY ("cohortId","userId")
);

-- AddForeignKey
ALTER TABLE "CohortManagerAssignment" ADD CONSTRAINT "CohortManagerAssignment_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "Cohort"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CohortManagerAssignment" ADD CONSTRAINT "CohortManagerAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- DataMigration: preserve every existing single cohortManagerId as a row in the new join table
-- before dropping the column it came from.
INSERT INTO "CohortManagerAssignment" ("cohortId", "userId")
SELECT "id", "cohortManagerId" FROM "Cohort" WHERE "cohortManagerId" IS NOT NULL;

-- DropForeignKey
ALTER TABLE "Cohort" DROP CONSTRAINT "Cohort_cohortManagerId_fkey";

-- DropIndex
DROP INDEX "Cohort_cohortManagerId_idx";

-- AlterTable
ALTER TABLE "Cohort" DROP COLUMN "cohortManagerId";
