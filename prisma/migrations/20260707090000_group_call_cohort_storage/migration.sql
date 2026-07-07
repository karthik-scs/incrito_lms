-- Add cohortId to GroupCallSlot (Bug 5: cohort-scoped group sessions)
ALTER TABLE "GroupCallSlot" ADD COLUMN "cohortId" TEXT;
ALTER TABLE "GroupCallSlot" ADD CONSTRAINT "GroupCallSlot_cohortId_fkey"
  FOREIGN KEY ("cohortId") REFERENCES "Cohort"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "GroupCallSlot_cohortId_idx" ON "GroupCallSlot"("cohortId");

-- FileUpload: track per-user uploaded file sizes for chat/discussion/community (Bug 8)
CREATE TABLE "FileUpload" (
  "id"        TEXT        NOT NULL,
  "userId"    TEXT        NOT NULL,
  "s3Key"     TEXT        NOT NULL,
  "sizeBytes" INTEGER     NOT NULL,
  "context"   TEXT        NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FileUpload_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "FileUpload_userId_idx" ON "FileUpload"("userId");
ALTER TABLE "FileUpload" ADD CONSTRAINT "FileUpload_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- UserStorageLimit: per-user storage cap override (Bug 8)
CREATE TABLE "UserStorageLimit" (
  "userId"  TEXT    NOT NULL,
  "limitMb" INTEGER NOT NULL DEFAULT 500,
  CONSTRAINT "UserStorageLimit_pkey" PRIMARY KEY ("userId")
);
ALTER TABLE "UserStorageLimit" ADD CONSTRAINT "UserStorageLimit_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
