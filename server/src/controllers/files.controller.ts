import type { Request, Response } from "express";
import { getPresignedGetUrl } from "../lib/s3";
import { AppError } from "../utils/AppError";

/**
 * Generic redirect for the "public-ish" upload types (avatars, thumbnails, chat/discussion/
 * community attachments, voice notes, certificate designs, submissions) — authenticated, but no
 * fine-grained per-resource permission check, unlike the dedicated recordings/lesson-content/
 * resource signed-URL endpoints. Always resolves to a *fresh* signed S3 URL on every request, so
 * the URL embedded in `<img src>`/`<video src>` stays stable and reusable even though the
 * underlying S3 access is always short-lived — nothing is ever served from a permanent public link.
 */
export async function redirectToFile(req: Request, res: Response) {
  // Express 5's named wildcard (`/*key`) yields an array of path segments, not a joined string.
  const segments = req.params.key;
  const key = Array.isArray(segments) ? segments.join("/") : segments;
  if (!key) {
    throw new AppError("No file key given", 400);
  }
  const url = await getPresignedGetUrl(key);
  return res.redirect(302, url);
}
