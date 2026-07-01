-- CreateEnum
CREATE TYPE "WhatsAppMessageType" AS ENUM ('TEXT', 'MEDIA', 'DOCUMENT');

-- AlterTable
ALTER TABLE "WhatsAppTemplate" ADD COLUMN     "messageType" "WhatsAppMessageType" NOT NULL DEFAULT 'TEXT',
ADD COLUMN     "sampleMediaUrl" TEXT;
