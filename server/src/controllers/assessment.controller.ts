import type { Request, Response } from "express";
import { success } from "../utils/apiResponse";
import * as assessmentService from "../services/assessment.service";

export async function list(req: Request, res: Response) {
  const { courseId, moduleId, lessonId } = req.query;
  const assessments = await assessmentService.listAssessments({
    courseId: courseId ? String(courseId) : undefined,
    moduleId: moduleId ? String(moduleId) : undefined,
    lessonId: lessonId ? String(lessonId) : undefined,
  });
  return success(res, assessments);
}

export async function create(req: Request, res: Response) {
  const assessment = await assessmentService.createAssessment(req.body, req.user!.id);
  return success(res, assessment, 201);
}

export async function getAdmin(req: Request, res: Response) {
  const assessment = await assessmentService.getAssessmentAdmin(String(req.params.id));
  return success(res, assessment);
}

export async function getForAttempt(req: Request, res: Response) {
  const assessment = await assessmentService.getAssessmentForAttempt(String(req.params.id));
  return success(res, assessment);
}

export async function update(req: Request, res: Response) {
  const assessment = await assessmentService.updateAssessment(String(req.params.id), req.body);
  return success(res, assessment);
}

export async function remove(req: Request, res: Response) {
  await assessmentService.deleteAssessment(String(req.params.id));
  return success(res, { deleted: true });
}

export async function startAttempt(req: Request, res: Response) {
  const attempt = await assessmentService.startAttempt(String(req.params.id), req.user!.id);
  return success(res, attempt, 201);
}

export async function submitAttempt(req: Request, res: Response) {
  const attempt = await assessmentService.submitAttempt(String(req.params.attemptId), req.user!.id, req.body.answers);
  return success(res, attempt);
}

export async function listMyAttempts(req: Request, res: Response) {
  const attempts = await assessmentService.listMyAttempts(String(req.params.id), req.user!.id);
  return success(res, attempts);
}
