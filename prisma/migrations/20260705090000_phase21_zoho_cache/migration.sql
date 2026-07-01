-- Phase 21: Cache Zoho's zsoid (org ID) and zuid (user ID, required as `presenter` when
-- scheduling) on UserLiveAccount, so they're fetched from Zoho once instead of before every
-- single meeting creation. (idempotent)

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='UserLiveAccount' AND column_name='zohoZsoid') THEN
    ALTER TABLE "UserLiveAccount" ADD COLUMN "zohoZsoid" TEXT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='UserLiveAccount' AND column_name='zohoZuid') THEN
    ALTER TABLE "UserLiveAccount" ADD COLUMN "zohoZuid" TEXT;
  END IF;
END $$;
