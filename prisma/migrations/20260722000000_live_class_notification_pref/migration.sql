-- Add liveClassEmails field to NotificationPreference
ALTER TABLE "NotificationPreference" ADD COLUMN IF NOT EXISTS "liveClassEmails" BOOLEAN NOT NULL DEFAULT TRUE;
