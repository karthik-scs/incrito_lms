-- Phase 31: Cohort-scoped curriculum
-- Module.courseId → cohortId so each cohort owns its own independent curriculum.

-- Step 1: Add the new cohortId column (nullable first so existing rows don't fail)
ALTER TABLE "Module" ADD COLUMN "cohortId" TEXT;

-- Step 2: Populate cohortId for existing modules — assign each module to the
-- oldest cohort of its course. Every cohort creates its own curriculum going forward;
-- this is a one-time preservation of existing data.
UPDATE "Module" m
SET "cohortId" = (
  SELECT c.id
  FROM "Cohort" c
  WHERE c."courseId" = m."courseId"
  ORDER BY c."createdAt" ASC
  LIMIT 1
)
WHERE m."courseId" IS NOT NULL;

-- Step 3: For any modules whose course has no cohort yet, delete them
-- (they cannot be assigned and would violate the NOT NULL constraint).
DELETE FROM "Module" WHERE "cohortId" IS NULL;

-- Step 4: Make cohortId NOT NULL now that all rows are populated
ALTER TABLE "Module" ALTER COLUMN "cohortId" SET NOT NULL;

-- Step 5: Add FK constraint to Cohort
ALTER TABLE "Module" ADD CONSTRAINT "Module_cohortId_fkey"
  FOREIGN KEY ("cohortId") REFERENCES "Cohort"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 6: Drop old unique index and create new one
DROP INDEX IF EXISTS "Module_courseId_order_key";
ALTER TABLE "Module" DROP CONSTRAINT IF EXISTS "Module_courseId_order_key";
ALTER TABLE "Module" ADD CONSTRAINT "Module_cohortId_order_key" UNIQUE ("cohortId", "order");

-- Step 7: Drop old FK and column
ALTER TABLE "Module" DROP CONSTRAINT IF EXISTS "Module_courseId_fkey";
ALTER TABLE "Module" DROP COLUMN "courseId";
