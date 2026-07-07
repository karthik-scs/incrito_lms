-- Add optional cohortId to Announcement for targeted cohort announcements
ALTER TABLE "Announcement" ADD COLUMN "cohortId" TEXT;
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_cohortId_fkey"
  FOREIGN KEY ("cohortId") REFERENCES "Cohort"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Announcement_cohortId_idx" ON "Announcement"("cohortId");
