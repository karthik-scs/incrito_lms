import type { Request, Response } from "express";
import { success } from "../utils/apiResponse";
import * as progressService from "../services/progress.service";

export async function myCourses(req: Request, res: Response) {
  const courses = await progressService.getMyCourses(req.user!.id);
  return success(res, courses);
}

export async function courseRoadmap(req: Request, res: Response) {
  const roadmap = await progressService.getCourseRoadmapForUser(
    req.user!.id,
    String(req.params.slug),
    req.user!.roleName,
    req.query.cohortId ? String(req.query.cohortId) : undefined
  );
  return success(res, roadmap);
}

export async function recentActivity(req: Request, res: Response) {
  const events = await progressService.getRecentActivity(req.user!.id, String(req.params.courseId));
  return success(res, events);
}

export async function myPoints(req: Request, res: Response) {
  const totalPoints = await progressService.getMyTotalPoints(req.user!.id);
  return success(res, { totalPoints });
}
