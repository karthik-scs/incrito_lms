import type { Request, Response } from "express";
import { success } from "../utils/apiResponse";
import { AppError } from "../utils/AppError";
import { env } from "../config/env";
import { inferResourceType, inferAttachmentType, extensionFor } from "../lib/uploads";
import { uploadObject, buildS3Key } from "../lib/s3";

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
  return success(res, {
    url: await persist(req, "discussion-attachments"),
    fileType: inferAttachmentType(req.file.mimetype),
  });
}

export async function chatAttachment(req: Request, res: Response) {
  if (!req.file) throw new AppError("No file was uploaded", 422);
  return success(res, {
    url: await persist(req, "chat-attachments"),
    fileType: inferAttachmentType(req.file.mimetype),
  });
}

export async function voiceNote(req: Request, res: Response) {
  return success(res, { url: await persist(req, "voice-notes"), fileType: "AUDIO" });
}

export async function communityCover(req: Request, res: Response) {
  return success(res, { url: await persist(req, "community-covers") });
}
