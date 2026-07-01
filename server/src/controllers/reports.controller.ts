import type { Request, Response } from "express";
import { success } from "../utils/apiResponse";
import * as reportsService from "../services/reports.service";

export async function courseReport(_req: Request, res: Response) {
  const rows = await reportsService.getCourseReport();
  return success(res, rows);
}

export async function cohortReport(_req: Request, res: Response) {
  const rows = await reportsService.getCohortReport();
  return success(res, rows);
}
