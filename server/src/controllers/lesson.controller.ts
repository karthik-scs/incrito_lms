import type { Request, Response } from "express";
import { success } from "../utils/apiResponse";
import * as lessonService from "../services/lesson.service";
import * as progressService from "../services/progress.service";
import * as hlsService from "../services/hls.service";

export async function list(req: Request, res: Response) {
  const moduleId = String(req.query.moduleId ?? "");
  const lessons = await lessonService.listLessons(moduleId);
  return success(res, lessons);
}

export async function get(req: Request, res: Response) {
  const lesson = await lessonService.getLessonDetail(String(req.params.id));
  return success(res, lesson);
}

export async function create(req: Request, res: Response) {
  const lesson = await lessonService.createLesson(req.body);
  return success(res, lesson, 201);
}

export async function update(req: Request, res: Response) {
  const lesson = await lessonService.updateLesson(String(req.params.id), req.body);
  return success(res, lesson);
}

export async function remove(req: Request, res: Response) {
  await lessonService.deleteLesson(String(req.params.id));
  return success(res, { deleted: true });
}

export async function updateLiveClass(req: Request, res: Response) {
  const liveClass = await lessonService.updateLiveClass(String(req.params.id), req.body);
  return success(res, liveClass);
}

export async function presignRecording(req: Request, res: Response) {
  const result = await lessonService.presignRecordingUpload(String(req.params.id), req.user!.id, req.body.contentType);
  return success(res, result);
}

export async function finalizeRecording(req: Request, res: Response) {
  const liveClass = await lessonService.finalizeRecordingUpload(String(req.params.id), req.user!.id, req.body.key);
  return success(res, liveClass);
}

export async function presignVideoContent(req: Request, res: Response) {
  const result = await lessonService.presignVideoContentUpload(String(req.params.id), req.user!.id, req.body.contentType);
  return success(res, result);
}

export async function finalizeVideoContent(req: Request, res: Response) {
  const lesson = await lessonService.finalizeVideoContentUpload(String(req.params.id), req.user!.id, req.body.key);
  return success(res, lesson);
}

export async function recordingUrl(req: Request, res: Response) {
  const url = await lessonService.getRecordingSignedUrl(String(req.params.id), req.user!.id);
  return success(res, { url, type: "mp4" as const });
}

export async function contentUrl(req: Request, res: Response) {
  const clientIp = req.ip ?? req.socket.remoteAddress ?? "";
  const result = await lessonService.getContentUrl(String(req.params.id), req.user!.id, clientIp);
  return success(res, result);
}

export async function streamContent(req: Request, res: Response) {
  const token = String(req.query.t ?? "");
  if (!token) throw new (await import("../utils/AppError")).AppError("Missing stream token", 401);
  const clientIp = req.ip ?? req.socket.remoteAddress ?? "";
  await lessonService.streamLessonContent(String(req.params.id), token, req.headers.range, clientIp, res);
}

export async function hlsManifest(req: Request, res: Response) {
  const token = String(req.query.t ?? "");
  if (!token) throw new (await import("../utils/AppError")).AppError("Missing stream token", 401);
  const clientIp = req.ip ?? req.socket.remoteAddress ?? "";
  // Validate token + IP before serving the manifest.
  const { verifyStreamToken } = await import("../services/token.service");
  let payload: { lessonId: string; userId: string };
  try {
    payload = verifyStreamToken(token, clientIp);
  } catch {
    throw new (await import("../utils/AppError")).AppError("Invalid or expired stream token", 401);
  }
  if (payload.lessonId !== String(req.params.id)) {
    throw new (await import("../utils/AppError")).AppError("Token does not match this lesson", 401);
  }
  const manifest = await hlsService.buildManifestResponse(String(req.params.id), token);
  res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
  res.setHeader("Cache-Control", "no-store");
  res.send(manifest);
}

export async function hlsKey(req: Request, res: Response) {
  const token = String(req.query.t ?? "");
  if (!token) throw new (await import("../utils/AppError")).AppError("Missing stream token", 401);
  const clientIp = req.ip ?? req.socket.remoteAddress ?? "";
  const { verifyStreamToken } = await import("../services/token.service");
  let payload: { lessonId: string; userId: string };
  try {
    payload = verifyStreamToken(token, clientIp);
  } catch {
    throw new (await import("../utils/AppError")).AppError("Invalid or expired stream token", 401);
  }
  if (payload.lessonId !== String(req.params.id)) {
    throw new (await import("../utils/AppError")).AppError("Token does not match this lesson", 401);
  }
  const keyBuf = await hlsService.getLessonHlsKey(String(req.params.id));
  res.setHeader("Content-Type", "application/octet-stream");
  res.setHeader("Content-Length", keyBuf.length);
  res.setHeader("Cache-Control", "no-store");
  res.send(keyBuf);
}

export async function complete(req: Request, res: Response) {
  const result = await progressService.markLessonComplete(req.user!.id, String(req.params.id));
  return success(res, result);
}

export async function reorder(req: Request, res: Response) {
  const lessons = await lessonService.reorderLessons(req.body.moduleId, req.body.orderedIds);
  return success(res, lessons);
}
