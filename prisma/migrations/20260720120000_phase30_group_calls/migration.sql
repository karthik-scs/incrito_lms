-- CreateEnum
CREATE TYPE "GroupCallStatus" AS ENUM ('OPEN', 'FULL', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "GroupCallRequestStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED');

-- CreateTable
CREATE TABLE "GroupCallSlot" (
    "id" TEXT NOT NULL,
    "mentorId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 60,
    "maxMembers" INTEGER NOT NULL DEFAULT 5,
    "topic" TEXT,
    "meetingUrl" TEXT,
    "status" "GroupCallStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupCallSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupCallRequest" (
    "id" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "status" "GroupCallRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupCallRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GroupCallSlot_mentorId_idx" ON "GroupCallSlot"("mentorId");
CREATE INDEX "GroupCallSlot_scheduledAt_idx" ON "GroupCallSlot"("scheduledAt");
CREATE INDEX "GroupCallRequest_slotId_idx" ON "GroupCallRequest"("slotId");
CREATE INDEX "GroupCallRequest_studentId_idx" ON "GroupCallRequest"("studentId");
CREATE UNIQUE INDEX "GroupCallRequest_slotId_studentId_key" ON "GroupCallRequest"("slotId", "studentId");

-- AddForeignKey
ALTER TABLE "GroupCallSlot" ADD CONSTRAINT "GroupCallSlot_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupCallRequest" ADD CONSTRAINT "GroupCallRequest_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "GroupCallSlot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupCallRequest" ADD CONSTRAINT "GroupCallRequest_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
