-- Phase 26: Dynamic plan creation/rename
-- Convert PlanTier enum columns to plain TEXT so admins can create arbitrary plan keys

-- Drop the enum-typed defaults first (they hold a reference to PlanTier)
ALTER TABLE "PlanSetting" ALTER COLUMN "plan" DROP DEFAULT;
ALTER TABLE "Enrollment" ALTER COLUMN "plan" DROP DEFAULT;

-- Convert the columns to TEXT
ALTER TABLE "PlanSetting" ALTER COLUMN "plan" TYPE TEXT USING "plan"::TEXT;
ALTER TABLE "Enrollment" ALTER COLUMN "plan" TYPE TEXT USING "plan"::TEXT;

-- Restore plain-text defaults
ALTER TABLE "Enrollment" ALTER COLUMN "plan" SET DEFAULT 'ICAP';

-- Add displayName column with sensible defaults for the two existing seeded plans
ALTER TABLE "PlanSetting" ADD COLUMN IF NOT EXISTS "displayName" TEXT NOT NULL DEFAULT '';
UPDATE "PlanSetting" SET "displayName" = 'ICAP' WHERE "plan" = 'ICAP' AND "displayName" = '';
UPDATE "PlanSetting" SET "displayName" = 'Intensive Pro' WHERE "plan" = 'INTENSIVE_PRO' AND "displayName" = '';

-- Now that no column depends on PlanTier, drop it
DROP TYPE IF EXISTS "PlanTier";
