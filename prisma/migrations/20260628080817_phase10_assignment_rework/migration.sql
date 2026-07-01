/*
  Warnings:

  - You are about to drop the column `cohortId` on the `Assignment` table. All the data in the column will be lost.
  - Added the required column `courseId` to the `Assignment` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Assignment" DROP CONSTRAINT "Assignment_cohortId_fkey";

-- DropIndex
DROP INDEX "Assignment_cohortId_idx";

-- AlterTable
ALTER TABLE "Assignment" DROP COLUMN "cohortId",
ADD COLUMN     "courseId" TEXT NOT NULL,
ADD COLUMN     "moduleId" TEXT,
ALTER COLUMN "dueDate" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Assignment_courseId_idx" ON "Assignment"("courseId");

-- CreateIndex
CREATE INDEX "Assignment_moduleId_idx" ON "Assignment"("moduleId");

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE SET NULL ON UPDATE CASCADE;
