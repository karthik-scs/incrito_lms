-- Phase 25: Add 1:1 call limits and feature permissions to PlanSetting;
-- add support contact fields to PlatformSetting.

-- PlanSetting additions
ALTER TABLE "PlanSetting"
  ADD COLUMN IF NOT EXISTS "canAccess1on1Calls"       BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS "mentorCallLimitPerMonth"   INTEGER,
  ADD COLUMN IF NOT EXISTS "studentCallLimitPerMonth"  INTEGER,
  ADD COLUMN IF NOT EXISTS "canDownloadResources"      BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS "canAccessRecordings"       BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS "canAccessCommunity"        BOOLEAN NOT NULL DEFAULT TRUE;

-- PlatformSetting additions (supportEmail already exists, add new columns only)
ALTER TABLE "PlatformSetting"
  ADD COLUMN IF NOT EXISTS "supportPhone"     TEXT,
  ADD COLUMN IF NOT EXISTS "supportCallStart" TEXT,
  ADD COLUMN IF NOT EXISTS "supportCallEnd"   TEXT,
  ADD COLUMN IF NOT EXISTS "supportFaqs"      JSONB;
