-- Phase 15: Premium Community System (idempotent)

-- 1. Community tables
CREATE TABLE IF NOT EXISTS "Community" (
  "id"          TEXT         NOT NULL,
  "name"        TEXT         NOT NULL,
  "description" TEXT,
  "coverUrl"    TEXT,
  "createdById" TEXT         NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Community_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CommunityMember" (
  "communityId" TEXT         NOT NULL,
  "userId"      TEXT         NOT NULL,
  "addedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommunityMember_pkey" PRIMARY KEY ("communityId", "userId")
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Community_createdById_fkey') THEN
    ALTER TABLE "Community" ADD CONSTRAINT "Community_createdById_fkey"
      FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CommunityMember_communityId_fkey') THEN
    ALTER TABLE "CommunityMember" ADD CONSTRAINT "CommunityMember_communityId_fkey"
      FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CommunityMember_userId_fkey') THEN
    ALTER TABLE "CommunityMember" ADD CONSTRAINT "CommunityMember_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Community_createdById_idx" ON "Community"("createdById");

-- 2. Post.communityId
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Post' AND column_name='communityId') THEN
    ALTER TABLE "Post" ADD COLUMN "communityId" TEXT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Post_communityId_fkey') THEN
    ALTER TABLE "Post" ADD CONSTRAINT "Post_communityId_fkey"
      FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Post_communityId_idx" ON "Post"("communityId");

-- 3. Comment.editedAt
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Comment' AND column_name='editedAt') THEN
    ALTER TABLE "Comment" ADD COLUMN "editedAt" TIMESTAMP(3);
  END IF;
END $$;

-- 4. Replace Reaction.type enum → emoji string
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Reaction' AND column_name='emoji') THEN
    -- already migrated; nothing to do
    NULL;
  ELSE
    ALTER TABLE "Reaction" ADD COLUMN "emoji" TEXT;
    UPDATE "Reaction" SET "emoji" = CASE "type"
      WHEN 'LIKE'      THEN '👍'
      WHEN 'LOVE'      THEN '❤️'
      WHEN 'CELEBRATE' THEN '🎉'
      ELSE '👍'
    END;
    ALTER TABLE "Reaction" ALTER COLUMN "emoji" SET NOT NULL;
    ALTER TABLE "Reaction" ALTER COLUMN "emoji" SET DEFAULT '👍';
    ALTER TABLE "Reaction" DROP COLUMN "type";
  END IF;
END $$;

DROP TYPE IF EXISTS "ReactionType";

-- 5. community:manage permission → Admin role
INSERT INTO "Permission" ("id", "key", "description")
SELECT
  'perm_cm_' || substr(md5(random()::text), 1, 16),
  'community:manage',
  'Create and manage premium communities'
WHERE NOT EXISTS (SELECT 1 FROM "Permission" WHERE "key" = 'community:manage');

INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM "Role" r
CROSS JOIN "Permission" p
WHERE r."name" = 'Admin' AND p."key" = 'community:manage'
ON CONFLICT DO NOTHING;
