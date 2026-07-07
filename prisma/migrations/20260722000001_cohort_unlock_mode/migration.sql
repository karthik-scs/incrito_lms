-- Add per-cohort unlock mode (defaults to FREE so existing cohorts keep free navigation)
ALTER TABLE "Cohort" ADD COLUMN IF NOT EXISTS "unlockMode" "UnlockMode" NOT NULL DEFAULT 'FREE';
