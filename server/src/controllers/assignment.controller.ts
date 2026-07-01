import type { Request, Response } from "express";
import { success } from "../utils/apiResponse";
import * as assignmentService from "../services/assignment.service";

export async function list(req: Request, res: Response) {
  const { courseId, moduleId, lessonId } = req.query;
  const assignments = await assignmentService.listAssignments({
    courseId: courseId ? String(courseId) : undefined,
    moduleId: moduleId ? String(moduleId) : undefined,
    lessonId: lessonId ? String(lessonId) : undefined,
  });
  return success(res, assignments);
}

export async function create(req: Request, res: Response) {
  const assignment = await assignmentService.createAssignment(req.body, req.user!.id);
  return success(res, assignment, 201);
}

export async function update(req: Request, res: Response) {
  const assignment = await assignmentService.updateAssignment(String(req.params.id), req.body);
  return success(res, assignment);
}

export async function remove(req: Request, res: Response) {
  await assignmentService.deleteAssignment(String(req.params.id));
  return success(res, { deleted: true });
}

export async function getMySubmission(req: Request, res: Response) {
  const submission = await assignmentService.getMySubmission(String(req.params.id), req.user!.id);
  return success(res, submission);
}

export async function listSubmissions(req: Request, res: Response) {
  const submissions = await assignmentService.listSubmissions(String(req.params.id));
  return success(res, submissions);
}

export async function submit(req: Request, res: Response) {
  const submission = await assignmentService.submitAssignment(String(req.params.id), req.user!.id, req.body);
  return success(res, submission, 201);
}

export async function grade(req: Request, res: Response) {
  const submission = await assignmentService.gradeSubmission(String(req.params.submissionId), req.user!.id, req.body);
  return success(res, submission);
}
