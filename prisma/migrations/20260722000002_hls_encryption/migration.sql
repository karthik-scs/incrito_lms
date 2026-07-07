-- CreateEnum
CREATE TYPE "HlsStatus" AS ENUM ('PENDING', 'PROCESSING', 'READY', 'FAILED');

-- AlterTable
ALTER TABLE "Lesson"
  ADD COLUMN "hlsManifestKey"   TEXT,
  ADD COLUMN "hlsEncryptionKey" TEXT,
  ADD COLUMN "hlsStatus"        "HlsStatus";
