-- Phase 18: Plans system (ICAP / Intensive Pro) — idempotent

-- ------------------------------------------------------------
-- 1. New enums
-- ------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE "PlanTier" AS ENUM ('ICAP', 'INTENSIVE_PRO');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "PlanAccess" AS ENUM ('ICAP', 'INTENSIVE_PRO', 'BOTH');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "DurationUnit" AS ENUM ('DAYS', 'MONTHS', 'YEARS');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ------------------------------------------------------------
-- 2. Course/Module/Lesson/CourseCertificate.planAccess (default BOTH — nothing currently visible locks for anyone)
-- ------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Course' AND column_name='planAccess') THEN
    ALTER TABLE "Course" ADD COLUMN "planAccess" "PlanAccess" NOT NULL DEFAULT 'BOTH';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Module' AND column_name='planAccess') THEN
    ALTER TABLE "Module" ADD COLUMN "planAccess" "PlanAccess" NOT NULL DEFAULT 'BOTH';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Lesson' AND column_name='planAccess') THEN
    ALTER TABLE "Lesson" ADD COLUMN "planAccess" "PlanAccess" NOT NULL DEFAULT 'BOTH';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='CourseCertificate' AND column_name='planAccess') THEN
    ALTER TABLE "CourseCertificate" ADD COLUMN "planAccess" "PlanAccess" NOT NULL DEFAULT 'BOTH';
  END IF;
END $$;

-- ------------------------------------------------------------
-- 3. PlanSetting — seed two rows with starting-default durations (admin can change immediately)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "PlanSetting" (
  "id"                            TEXT           NOT NULL,
  "plan"                          "PlanTier"     NOT NULL,
  "lmsAccessDurationValue"        INTEGER        NOT NULL,
  "lmsAccessDurationUnit"         "DurationUnit" NOT NULL,
  "recordingAccessDurationValue"  INTEGER        NOT NULL,
  "recordingAccessDurationUnit"   "DurationUnit" NOT NULL,
  "updatedAt"                     TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlanSetting_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PlanSetting_plan_key" ON "PlanSetting"("plan");

INSERT INTO "PlanSetting" ("id", "plan", "lmsAccessDurationValue", "lmsAccessDurationUnit", "recordingAccessDurationValue", "recordingAccessDurationUnit")
SELECT 'plansetting_icap', 'ICAP', 6, 'MONTHS', 3, 'MONTHS'
WHERE NOT EXISTS (SELECT 1 FROM "PlanSetting" WHERE "plan" = 'ICAP');

INSERT INTO "PlanSetting" ("id", "plan", "lmsAccessDurationValue", "lmsAccessDurationUnit", "recordingAccessDurationValue", "recordingAccessDurationUnit")
SELECT 'plansetting_intensive_pro', 'INTENSIVE_PRO', 1, 'YEARS', 1, 'YEARS'
WHERE NOT EXISTS (SELECT 1 FROM "PlanSetting" WHERE "plan" = 'INTENSIVE_PRO');

-- ------------------------------------------------------------
-- 4. Enrollment.plan + expiry snapshots
--    Existing enrollments backfill to ICAP and get their expiry computed from ICAP's seeded
--    duration above, anchored to their own enrolledAt — same computation new enrollments will
--    use going forward, just applied once here for rows that predate this feature.
-- ------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Enrollment' AND column_name='plan') THEN
    ALTER TABLE "Enrollment" ADD COLUMN "plan" "PlanTier" NOT NULL DEFAULT 'ICAP';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Enrollment' AND column_name='lmsAccessExpiresAt') THEN
    ALTER TABLE "Enrollment" ADD COLUMN "lmsAccessExpiresAt" TIMESTAMP(3);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Enrollment' AND column_name='recordingAccessExpiresAt') THEN
    ALTER TABLE "Enrollment" ADD COLUMN "recordingAccessExpiresAt" TIMESTAMP(3);
  END IF;
END $$;

UPDATE "Enrollment" e
SET
  "lmsAccessExpiresAt" = e."enrolledAt" + (ps."lmsAccessDurationValue" || ' ' || lower(ps."lmsAccessDurationUnit"::text))::interval,
  "recordingAccessExpiresAt" = e."enrolledAt" + (ps."recordingAccessDurationValue" || ' ' || lower(ps."recordingAccessDurationUnit"::text))::interval
FROM "PlanSetting" ps
WHERE ps."plan" = e."plan" AND e."lmsAccessExpiresAt" IS NULL;

-- ------------------------------------------------------------
-- 5. plan:manage permission → Admin role
-- ------------------------------------------------------------
INSERT INTO "Permission" ("id", "key", "description")
SELECT
  'perm_plan_' || substr(md5(random()::text), 1, 16),
  'plan:manage',
  'Configure plan durations and assign plans at enrollment'
WHERE NOT EXISTS (SELECT 1 FROM "Permission" WHERE "key" = 'plan:manage');

INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM "Role" r
CROSS JOIN "Permission" p
WHERE r."name" = 'Admin' AND p."key" = 'plan:manage'
ON CONFLICT DO NOTHING;
