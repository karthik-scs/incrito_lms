-- Phase 17: Chat redesigned from per-cohort group chat to 1:1 direct messages,
-- plus Polls and Events for premium communities. (idempotent)

-- ------------------------------------------------------------
-- 1. Chat: drop cohort-group shape, move to 1:1 DM (dmKey)
-- ------------------------------------------------------------
-- Existing Conversation/ConversationParticipant/ChatMessage rows (previously one group room per
-- cohort) are NOT deleted — no destructive action on real data. They simply become unreachable
-- through the new 1:1-only chat UI/API (which only ever looks conversations up by dmKey for an
-- exact pair of users), but every row, every message, stays in the database exactly as it was.
-- Each pre-existing conversation gets its own `id` as a (unique-by-construction) dmKey value so
-- the new NOT NULL UNIQUE constraint can be satisfied without touching any other column.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Conversation_cohortId_fkey') THEN
    ALTER TABLE "Conversation" DROP CONSTRAINT "Conversation_cohortId_fkey";
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Conversation' AND column_name='cohortId') THEN
    ALTER TABLE "Conversation" DROP COLUMN "cohortId";
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Conversation' AND column_name='dmKey') THEN
    ALTER TABLE "Conversation" ADD COLUMN "dmKey" TEXT;
  END IF;
END $$;

UPDATE "Conversation" SET "dmKey" = "id" WHERE "dmKey" IS NULL;
ALTER TABLE "Conversation" ALTER COLUMN "dmKey" SET NOT NULL;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Conversation_dmKey_key') THEN
    CREATE UNIQUE INDEX "Conversation_dmKey_key" ON "Conversation"("dmKey");
  END IF;
END $$;

-- ------------------------------------------------------------
-- 2. Polls
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "Poll" (
  "id"          TEXT         NOT NULL,
  "communityId" TEXT         NOT NULL,
  "question"    TEXT         NOT NULL,
  "createdById" TEXT         NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Poll_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PollOption" (
  "id"     TEXT NOT NULL,
  "pollId" TEXT NOT NULL,
  "label"  TEXT NOT NULL,
  CONSTRAINT "PollOption_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PollVote" (
  "id"       TEXT         NOT NULL,
  "pollId"   TEXT         NOT NULL,
  "optionId" TEXT         NOT NULL,
  "userId"   TEXT         NOT NULL,
  "votedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PollVote_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Poll_communityId_fkey') THEN
    ALTER TABLE "Poll" ADD CONSTRAINT "Poll_communityId_fkey"
      FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Poll_createdById_fkey') THEN
    ALTER TABLE "Poll" ADD CONSTRAINT "Poll_createdById_fkey"
      FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PollOption_pollId_fkey') THEN
    ALTER TABLE "PollOption" ADD CONSTRAINT "PollOption_pollId_fkey"
      FOREIGN KEY ("pollId") REFERENCES "Poll"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PollVote_pollId_fkey') THEN
    ALTER TABLE "PollVote" ADD CONSTRAINT "PollVote_pollId_fkey"
      FOREIGN KEY ("pollId") REFERENCES "Poll"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PollVote_optionId_fkey') THEN
    ALTER TABLE "PollVote" ADD CONSTRAINT "PollVote_optionId_fkey"
      FOREIGN KEY ("optionId") REFERENCES "PollOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PollVote_userId_fkey') THEN
    ALTER TABLE "PollVote" ADD CONSTRAINT "PollVote_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Poll_communityId_idx" ON "Poll"("communityId");
CREATE INDEX IF NOT EXISTS "PollOption_pollId_idx" ON "PollOption"("pollId");
CREATE UNIQUE INDEX IF NOT EXISTS "PollVote_pollId_userId_key" ON "PollVote"("pollId", "userId");

-- ------------------------------------------------------------
-- 3. Events
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "CommunityEvent" (
  "id"          TEXT         NOT NULL,
  "communityId" TEXT         NOT NULL,
  "title"       TEXT         NOT NULL,
  "description" TEXT,
  "startTime"   TIMESTAMP(3) NOT NULL,
  "endTime"     TIMESTAMP(3),
  "location"    TEXT,
  "createdById" TEXT         NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommunityEvent_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CommunityEvent_communityId_fkey') THEN
    ALTER TABLE "CommunityEvent" ADD CONSTRAINT "CommunityEvent_communityId_fkey"
      FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CommunityEvent_createdById_fkey') THEN
    ALTER TABLE "CommunityEvent" ADD CONSTRAINT "CommunityEvent_createdById_fkey"
      FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "CommunityEvent_communityId_idx" ON "CommunityEvent"("communityId");
