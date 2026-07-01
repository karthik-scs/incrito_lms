-- Phase 20: Multi-provider live classes — per-user connected Zoom/Zoho accounts. (idempotent)

DO $$ BEGIN
  CREATE TYPE "LiveProvider" AS ENUM ('ZOOM', 'ZOHO');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "UserLiveAccount" (
  "id"                   TEXT         NOT NULL,
  "userId"               TEXT         NOT NULL,
  "provider"             "LiveProvider" NOT NULL,
  "zoomAccountId"        TEXT,
  "zoomClientId"         TEXT,
  "zoomClientSecret"     TEXT,
  "zoomSecretToken"      TEXT,
  "zohoRefreshToken"     TEXT,
  "zohoAccountOwnerName" TEXT,
  "isActive"             BOOLEAN      NOT NULL DEFAULT true,
  "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"            TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserLiveAccount_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserLiveAccount_userId_provider_key" ON "UserLiveAccount"("userId", "provider");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'UserLiveAccount_userId_fkey') THEN
    ALTER TABLE "UserLiveAccount" ADD CONSTRAINT "UserLiveAccount_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='LiveClass' AND column_name='provider') THEN
    ALTER TABLE "LiveClass" ADD COLUMN "provider" "LiveProvider" NOT NULL DEFAULT 'ZOOM';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='LiveClass' AND column_name='userLiveAccountId') THEN
    ALTER TABLE "LiveClass" ADD COLUMN "userLiveAccountId" TEXT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='LiveClass' AND column_name='zohoMeetingId') THEN
    ALTER TABLE "LiveClass" ADD COLUMN "zohoMeetingId" TEXT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LiveClass_userLiveAccountId_fkey') THEN
    ALTER TABLE "LiveClass" ADD CONSTRAINT "LiveClass_userLiveAccountId_fkey"
      FOREIGN KEY ("userLiveAccountId") REFERENCES "UserLiveAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "LiveClass_userLiveAccountId_idx" ON "LiveClass"("userLiveAccountId");
