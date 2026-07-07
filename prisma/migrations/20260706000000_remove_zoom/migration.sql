-- Remove Zoom completely — Zoho Meeting is the only live class provider.

-- 1. Update any existing LiveClass rows that still have provider = 'ZOOM' to ZOHO before
--    we recreate the enum without the ZOOM value.
UPDATE "LiveClass" SET "provider" = 'ZOHO' WHERE "provider" = 'ZOOM';

-- 2. Delete any UserLiveAccount rows connected to Zoom.
DELETE FROM "UserLiveAccount" WHERE "provider" = 'ZOOM';

-- 3. Drop Zoom-specific columns from LiveClass.
ALTER TABLE "LiveClass" DROP COLUMN IF EXISTS "zoomAccountId";
ALTER TABLE "LiveClass" DROP COLUMN IF EXISTS "zoomMeetingId";
ALTER TABLE "LiveClass" DROP COLUMN IF EXISTS "zoomPasscode";

-- 4. Drop Zoom-specific columns from UserLiveAccount.
ALTER TABLE "UserLiveAccount" DROP COLUMN IF EXISTS "zoomAccountId";
ALTER TABLE "UserLiveAccount" DROP COLUMN IF EXISTS "zoomClientId";
ALTER TABLE "UserLiveAccount" DROP COLUMN IF EXISTS "zoomClientSecret";
ALTER TABLE "UserLiveAccount" DROP COLUMN IF EXISTS "zoomSecretToken";

-- 5. Drop the ZoomAccount FK constraint and index before dropping the table.
ALTER TABLE "LiveClass" DROP CONSTRAINT IF EXISTS "LiveClass_zoomAccountId_fkey";
DROP INDEX IF EXISTS "LiveClass_zoomAccountId_idx";

-- 6. Drop the ZoomAccount table.
DROP TABLE IF EXISTS "ZoomAccount";

-- 7. Recreate the LiveProvider enum without ZOOM.
--    PostgreSQL does not support removing values from an existing enum, so we:
--    a. Create the new enum
--    b. Alter the columns to use it (casting via text)
--    c. Drop the old enum

ALTER TYPE "LiveProvider" RENAME TO "LiveProvider_old";
CREATE TYPE "LiveProvider" AS ENUM ('ZOHO');

-- Drop defaults before altering column types (PostgreSQL cannot cast a typed default automatically)
ALTER TABLE "LiveClass" ALTER COLUMN "provider" DROP DEFAULT;
ALTER TABLE "UserLiveAccount" ALTER COLUMN "provider" DROP DEFAULT;

ALTER TABLE "LiveClass"
  ALTER COLUMN "provider" TYPE "LiveProvider"
  USING "provider"::text::"LiveProvider";

ALTER TABLE "UserLiveAccount"
  ALTER COLUMN "provider" TYPE "LiveProvider"
  USING "provider"::text::"LiveProvider";

DROP TYPE "LiveProvider_old";

-- 8. Update the column default to match the new single-value enum.
ALTER TABLE "LiveClass" ALTER COLUMN "provider" SET DEFAULT 'ZOHO';
