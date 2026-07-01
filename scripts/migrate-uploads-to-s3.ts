/**
 * One-off migration: every file under local `uploads/` -> S3, with a DB backfill from the old
 * `${PUBLIC_API_URL}/uploads/<folder>/<file>` URL to the new storage scheme for that folder.
 * Safe to re-run — re-uploading an already-migrated file just overwrites the same S3 key, and the
 * DB `updateMany` only touches rows still pointing at the old URL.
 *
 * Run once, after AWS_* env vars are configured: `npx tsx scripts/migrate-uploads-to-s3.ts`
 */
import fs from "node:fs";
import path from "node:path";
import { prisma } from "../server/src/lib/prisma";
import { uploadObject, isS3Configured } from "../server/src/lib/s3";
import { env } from "../server/src/config/env";

const UPLOADS_DIR = path.resolve(process.cwd(), "uploads");

const EXTENSION_MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".mp4": "video/mp4",
  ".webm": "audio/webm",
  ".mov": "video/quicktime",
  ".ogg": "audio/ogg",
  ".mp3": "audio/mpeg",
  ".m4a": "audio/mp4",
  ".wav": "audio/wav",
};

/** folder -> (filename, oldUrl, newKey) -> which model/field backfill to run. `recordings` stores a bare key; everything else stores the `/api/files/` redirect URL (see upload.controller.ts#persist). */
const FOLDER_BACKFILL: Record<string, (oldUrl: string, newValue: string) => Promise<number>> = {
  avatars: async (oldUrl, newValue) => (await prisma.user.updateMany({ where: { avatarUrl: oldUrl }, data: { avatarUrl: newValue } })).count,
  "course-thumbnails": async (oldUrl, newValue) =>
    (await prisma.course.updateMany({ where: { thumbnailUrl: oldUrl }, data: { thumbnailUrl: newValue } })).count,
  "lesson-thumbnails": async (oldUrl, newValue) =>
    (await prisma.lesson.updateMany({ where: { thumbnailUrl: oldUrl }, data: { thumbnailUrl: newValue } })).count,
  resources: async (oldUrl, newValue) => (await prisma.resource.updateMany({ where: { fileUrl: oldUrl }, data: { fileUrl: newValue } })).count,
  submissions: async (oldUrl, newValue) =>
    (await prisma.submission.updateMany({ where: { fileUrl: oldUrl }, data: { fileUrl: newValue } })).count,
  "certificate-designs": async (oldUrl, newValue) =>
    (await prisma.certificateTemplate.updateMany({ where: { designUrl: oldUrl }, data: { designUrl: newValue } })).count,
  "discussion-attachments": async (oldUrl, newValue) =>
    (await prisma.comment.updateMany({ where: { attachmentUrl: oldUrl }, data: { attachmentUrl: newValue } })).count,
  "chat-attachments": async (oldUrl, newValue) =>
    (await prisma.chatMessage.updateMany({ where: { attachmentUrl: oldUrl }, data: { attachmentUrl: newValue } })).count,
  "voice-notes": async (oldUrl, newValue) =>
    (await prisma.chatMessage.updateMany({ where: { attachmentUrl: oldUrl }, data: { attachmentUrl: newValue } })).count,
  "community-covers": async (oldUrl, newValue) =>
    (await prisma.community.updateMany({ where: { coverUrl: oldUrl }, data: { coverUrl: newValue } })).count,
  recordings: async (oldUrl, newValue) =>
    (await prisma.liveClass.updateMany({ where: { recordingUrl: oldUrl }, data: { recordingUrl: newValue } })).count,
};

async function main() {
  if (!isS3Configured()) {
    console.error("AWS S3 is not configured (AWS_REGION/AWS_S3_BUCKET/AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY) — aborting.");
    process.exit(1);
  }
  if (!fs.existsSync(UPLOADS_DIR)) {
    console.log("No local uploads/ directory found — nothing to migrate.");
    return;
  }

  let uploaded = 0;
  let backfilled = 0;

  for (const folder of fs.readdirSync(UPLOADS_DIR)) {
    const folderPath = path.join(UPLOADS_DIR, folder);
    if (!fs.statSync(folderPath).isDirectory()) continue;
    const backfill = FOLDER_BACKFILL[folder];
    if (!backfill) {
      console.warn(`  Skipping unknown folder "${folder}" — no backfill mapping defined.`);
      continue;
    }

    for (const filename of fs.readdirSync(folderPath)) {
      const filePath = path.join(folderPath, filename);
      const buffer = fs.readFileSync(filePath);
      const ext = path.extname(filename).toLowerCase();
      const contentType = EXTENSION_MIME[ext] ?? "application/octet-stream";
      const key = `${folder}/${filename}`;

      await uploadObject(key, buffer, contentType);
      uploaded++;

      const oldUrl = `${env.PUBLIC_API_URL}/uploads/${folder}/${filename}`;
      const newValue = folder === "recordings" ? key : `${env.PUBLIC_API_URL}/api/files/${key}`;
      const count = await backfill(oldUrl, newValue);
      backfilled += count;

      console.log(`  ${key} -> uploaded${count > 0 ? `, backfilled ${count} row(s)` : ""}`);
    }
  }

  console.log(`\nDone — ${uploaded} file(s) uploaded to S3, ${backfilled} DB row(s) backfilled.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
