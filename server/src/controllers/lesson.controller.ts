import type { Request, Response } from "express";
import { success } from "../utils/apiResponse";
import * as lessonService from "../services/lesson.service";
import * as progressService from "../services/progress.service";

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

export async function recordingUrl(req: Request, res: Response) {
  const url = await lessonService.getRecordingSignedUrl(String(req.params.id), req.user!.id);
  return success(res, { url });
}

export async function contentUrl(req: Request, res: Response) {
  const url = await lessonService.getContentSignedUrl(String(req.params.id), req.user!.id);
  return success(res, { url });
}

export async function complete(req: Request, res: Response) {
  const result = await progressService.markLessonComplete(req.user!.id, String(req.params.id));
  return success(res, result);
}

export async function reorder(req: Request, res: Response) {
  const lessons = await lessonService.reorderLessons(req.body.moduleId, req.body.orderedIds);
  return success(res, lessons);
}
