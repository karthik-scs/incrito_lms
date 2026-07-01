import type { Request, Response } from "express";
import { success } from "../utils/apiResponse";
import { AppError } from "../utils/AppError";
import * as enrollmentService from "../services/enrollment.service";

export async function list(req: Request, res: Response) {
  const cohortId = req.query.cohortId ? String(req.query.cohortId) : undefined;
  const userId = req.query.userId ? String(req.query.userId) : undefined;
  const enrollments = await enrollmentService.listEnrollments({ cohortId, userId });
  return success(res, enrollments);
}

export async function create(req: Request, res: Response) {
  const { plan, ...rest } = req.body;
  if (plan && !req.user!.permissions.includes("plan:manage")) {
    throw new AppError("You do not have permission to set the enrollment plan", 403);
  }
  const enrollment = await enrollmentService.createEnrollment({ ...rest, plan });
  return success(res, enrollment, 201);
}

export async function updateStatus(req: Request, res: Response) {
  const enrollment = await enrollmentService.updateEnrollmentStatus(String(req.params.id), req.body.status);
  return success(res, enrollment);
}

export async function updatePlan(req: Request, res: Response) {
  const enrollment = await enrollmentService.updateEnrollmentPlan(String(req.params.id), req.body.plan);
  return success(res, enrollment);
}

export async function remove(req: Request, res: Response) {
  await enrollmentService.deleteEnrollment(String(req.params.id));
  return success(res, { deleted: true });
}
