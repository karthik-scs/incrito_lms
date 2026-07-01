-- AlterTable
ALTER TABLE "LiveClass" ADD COLUMN     "endedAt" TIMESTAMP(3),
ADD COLUMN     "startedAt" TIMESTAMP(3),
ADD COLUMN     "zoomAccountId" TEXT;

-- CreateTable
CREATE TABLE "ZoomAccount" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "zoomAccountId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "clientSecret" TEXT NOT NULL,
    "secretToken" TEXT NOT NULL,
    "sdkKey" TEXT,
    "sdkSecret" TEXT,
    "concurrentLimit" INTEGER NOT NULL DEFAULT 2,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ZoomAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LiveClass_zoomAccountId_idx" ON "LiveClass"("zoomAccountId");

-- AddForeignKey
ALTER TABLE "LiveClass" ADD CONSTRAINT "LiveClass_zoomAccountId_fkey" FOREIGN KEY ("zoomAccountId") REFERENCES "ZoomAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
