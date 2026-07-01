-- Phase 19: Chat redesign — per-user conversation pinning + chat message reactions. (idempotent)

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ConversationParticipant' AND column_name='pinned') THEN
    ALTER TABLE "ConversationParticipant" ADD COLUMN "pinned" BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Reaction' AND column_name='messageId') THEN
    ALTER TABLE "Reaction" ADD COLUMN "messageId" TEXT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Reaction_messageId_fkey') THEN
    ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_messageId_fkey"
      FOREIGN KEY ("messageId") REFERENCES "ChatMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- The old unique index didn't cover messageId — drop and recreate including it so a user can
-- still only react once per post/comment/message (Postgres treats NULL columns as distinct, so
-- the app's service layer does its own findFirst-then-toggle rather than relying on this index
-- alone — same existing pattern already used for postId/commentId reactions).
DROP INDEX IF EXISTS "Reaction_userId_postId_commentId_key";

CREATE UNIQUE INDEX IF NOT EXISTS "Reaction_userId_postId_commentId_messageId_key"
  ON "Reaction"("userId", "postId", "commentId", "messageId");
