import type { Request, Response } from "express";
import { success } from "../utils/apiResponse";
import { AppError } from "../utils/AppError";
import { env } from "../config/env";
import { inferResourceType, inferAttachmentType, extensionFor } from "../lib/uploads";
import { uploadObject, buildS3Key } from "../lib/s3";
import { assertStorageAvailable, trackFileUpload } from "../services/storage.service";

/** Pushes the in-memory buffer to S3 and returns the stable backend URL that always redirects to a fresh signed URL — never a raw S3 link. */
async function persist(req: Request, folder: string): Promise<string> {
  if (!req.file) throw new AppError("No file was uploaded", 422);
  const key = buildS3Key(folder, req.user!.id, extensionFor(req.file.mimetype));
  await uploadObject(key, req.file.buffer, req.file.mimetype);
  return `${env.PUBLIC_API_URL}/api/files/${key}`;
}

export async function courseThumbnail(req: Request, res: Response) {
  return success(res, { url: await persist(req, "course-thumbnails") });
}

export async function lessonThumbnail(req: Request, res: Response) {
  return success(res, { url: await persist(req, "lesson-thumbnails") });
}

export async function resource(req: Request, res: Response) {
  if (!req.file) throw new AppError("No file was uploaded", 422);
  return success(res, {
    url: await persist(req, "resources"),
    fileType: inferResourceType(req.file.mimetype),
  });
}

export async function submission(req: Request, res: Response) {
  return success(res, { url: await persist(req, "submissions") });
}

export async function certificateDesign(req: Request, res: Response) {
  return success(res, { url: await persist(req, "certificate-designs") });
}

export async function discussionAttachment(req: Request, res: Response) {
  if (!req.file) throw new AppError("No file was uploaded", 422);
  await assertStorageAvailable(req.user!.id, req.file.size);
  const url = await persist(req, "discussion-attachments");
  const key = url.split("/api/files/")[1];
  if (key) await trackFileUpload(req.user!.id, key, req.file.size, "DISCUSSION");
  return success(res, { url, fileType: inferAttachmentType(req.file.mimetype) });
}

export async function chatAttachment(req: Request, res: Response) {
  if (!req.file) throw new AppError("No file was uploaded", 422);
  await assertStorageAvailable(req.user!.id, req.file.size);
  const url = await persist(req, "chat-attachments");
  const key = url.split("/api/files/")[1];
  if (key) await trackFileUpload(req.user!.id, key, req.file.size, "CHAT");
  return success(res, { url, fileType: inferAttachmentType(req.file.mimetype) });
}

export async function voiceNote(req: Request, res: Response) {
  if (!req.file) throw new AppError("No file was uploaded", 422);
  await assertStorageAvailable(req.user!.id, req.file.size);
  const url = await persist(req, "voice-notes");
  const key = url.split("/api/files/")[1];
  if (key) await trackFileUpload(req.user!.id, key, req.file.size, "CHAT");
  return success(res, { url, fileType: "AUDIO" });
}

export async function communityCover(req: Request, res: Response) {
  return success(res, { url: await persist(req, "community-covers") });
}
