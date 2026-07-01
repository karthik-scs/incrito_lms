-- MentorAvailability
CREATE TABLE IF NOT EXISTS "MentorAvailability" (
  "id"         TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "mentorId"   TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "dayOfWeek"  INTEGER NOT NULL,
  "startTime"  TEXT NOT NULL,
  "endTime"    TEXT NOT NULL,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "MentorAvailability_mentorId_idx" ON "MentorAvailability"("mentorId");

-- BookingStatus enum
DO $$ BEGIN
  CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- MentorBooking
CREATE TABLE IF NOT EXISTS "MentorBooking" (
  "id"              TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "mentorId"        TEXT NOT NULL REFERENCES "User"("id"),
  "studentId"       TEXT NOT NULL REFERENCES "User"("id"),
  "cohortId"        TEXT REFERENCES "Cohort"("id"),
  "scheduledAt"     TIMESTAMP(3) NOT NULL,
  "durationMinutes" INTEGER NOT NULL DEFAULT 30,
  "status"          "BookingStatus" NOT NULL DEFAULT 'PENDING',
  "topic"           TEXT,
  "notes"           TEXT,
  "meetingUrl"      TEXT,
  "cancelReason"    TEXT,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "MentorBooking_mentorId_idx"  ON "MentorBooking"("mentorId");
CREATE INDEX IF NOT EXISTS "MentorBooking_studentId_idx" ON "MentorBooking"("studentId");

-- MentorRating
CREATE TABLE IF NOT EXISTS "MentorRating" (
  "id"        TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "mentorId"  TEXT NOT NULL REFERENCES "User"("id"),
  "studentId" TEXT NOT NULL REFERENCES "User"("id"),
  "bookingId" TEXT UNIQUE REFERENCES "MentorBooking"("id"),
  "rating"    INTEGER NOT NULL,
  "comment"   TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "MentorRating_mentorId_studentId_bookingId_key"
  ON "MentorRating"("mentorId", "studentId", "bookingId");
CREATE INDEX IF NOT EXISTS "MentorRating_mentorId_idx" ON "MentorRating"("mentorId");

-- CallType / CallStatus enums
DO $$ BEGIN
  CREATE TYPE "CallType" AS ENUM ('AUDIO', 'VIDEO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "CallStatus" AS ENUM ('RINGING', 'ACTIVE', 'ENDED', 'MISSED', 'DECLINED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- CallSession
CREATE TABLE IF NOT EXISTS "CallSession" (
  "id"            TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "callerId"      TEXT NOT NULL REFERENCES "User"("id"),
  "calleeId"      TEXT NOT NULL REFERENCES "User"("id"),
  "callType"      "CallType"   NOT NULL,
  "status"        "CallStatus" NOT NULL DEFAULT 'RINGING',
  "offerSdp"      TEXT,
  "answerSdp"     TEXT,
  "iceCandidates" JSONB NOT NULL DEFAULT '[]',
  "startedAt"     TIMESTAMP(3),
  "endedAt"       TIMESTAMP(3),
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "CallSession_calleeId_status_idx" ON "CallSession"("calleeId", "status");
CREATE INDEX IF NOT EXISTS "CallSession_callerId_createdAt_idx" ON "CallSession"("callerId", "createdAt");
