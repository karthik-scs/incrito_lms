-- Phase 24: Add maxDevicesPerUser to PlatformSetting for admin-controlled concurrent session limits.
ALTER TABLE "PlatformSetting" ADD COLUMN IF NOT EXISTS "maxDevicesPerUser" INTEGER NOT NULL DEFAULT 5;
