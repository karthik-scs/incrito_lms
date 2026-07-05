import type { Request, Response } from "express";
import { AppError } from "../utils/AppError";
import { success } from "../utils/apiResponse";
import * as cohortService from "../services/cohort.service";

export async function list(req: Request, res: Response) {
  const cohorts = await cohortService.listCohorts({ courseId: req.query.courseId as string | undefined });
  return success(res, cohorts);
}

export async function get(req: Request, res: Response) {
  const cohort = await cohortService.getCohort(String(req.params.id));
  return success(res, cohort);
}

export async function create(req: Request, res: Response) {
  const cohort = await cohortService.createCohort(req.body);
  return success(res, cohort, 201);
}

export async function update(req: Request, res: Response) {
  const cohort = await cohortService.updateCohort(String(req.params.id), req.body);
  return success(res, cohort);
}

export async function addMentor(req: Request, res: Response) {
  const cohort = await cohortService.addCohortMentor(String(req.params.id), req.body.userId);
  return success(res, cohort);
}

export async function removeMentor(req: Request, res: Response) {
  const cohort = await cohortService.removeCohortMentor(String(req.params.id), String(req.params.userId));
  return success(res, cohort);
}

export async function addManager(req: Request, res: Response) {
  if (req.user!.roleName !== "Admin") throw new AppError("Only admins can assign cohort managers", 403);
  const cohort = await cohortService.addCohortManager(String(req.params.id), req.body.userId);
  return success(res, cohort);
}

export async function removeManager(req: Request, res: Response) {
  if (req.user!.roleName !== "Admin") throw new AppError("Only admins can remove cohort managers", 403);
  const cohort = await cohortService.removeCohortManager(String(req.params.id), String(req.params.userId));
  return success(res, cohort);
}

export async function progress(req: Request, res: Response) {
  const rows = await cohortService.getCohortProgress(String(req.params.id));
  return success(res, rows);
}

export async function members(req: Request, res: Response) {
  const rows = await cohortService.listCohortMembers(String(req.params.id), req.user!.id);
  return success(res, rows);
}

export async function stats(_req: Request, res: Response) {
  const result = await cohortService.getCohortStats();
  return success(res, result);
}
