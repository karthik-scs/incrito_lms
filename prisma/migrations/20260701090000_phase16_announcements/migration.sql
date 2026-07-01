-- Phase 16: Admin Announcements (idempotent)

DO $$ BEGIN
  CREATE TYPE "AnnouncementAudience" AS ENUM ('ALL', 'STUDENTS', 'MENTORS', 'COHORT_MANAGERS');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "Announcement" (
  "id"          TEXT                   NOT NULL,
  "title"       TEXT                   NOT NULL,
  "content"     TEXT                   NOT NULL,
  "audience"    "AnnouncementAudience" NOT NULL DEFAULT 'ALL',
  "createdById" TEXT                   NOT NULL,
  "createdAt"   TIMESTAMP(3)           NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Announcement_createdById_fkey') THEN
    ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_createdById_fkey"
      FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Announcement_createdById_idx" ON "Announcement"("createdById");

-- announcement:write permission → Admin role
INSERT INTO "Permission" ("id", "key", "description")
SELECT
  'perm_ann_' || substr(md5(random()::text), 1, 16),
  'announcement:write',
  'Create and manage platform announcements'
WHERE NOT EXISTS (SELECT 1 FROM "Permission" WHERE "key" = 'announcement:write');

INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM "Role" r
CROSS JOIN "Permission" p
WHERE r."name" = 'Admin' AND p."key" = 'announcement:write'
ON CONFLICT DO NOTHING;
