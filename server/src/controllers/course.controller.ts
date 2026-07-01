import type { Request, Response } from "express";
import { success } from "../utils/apiResponse";
import * as courseService from "../services/course.service";

export async function list(req: Request, res: Response) {
  const courses = await courseService.listCourses({
    categoryId: req.query.categoryId as string | undefined,
    status: req.query.status as string | undefined,
    requestingUserId: req.user?.id,
    requestingUserRole: req.user?.roleName,
  });
  return success(res, courses);
}

export async function getBySlug(req: Request, res: Response) {
  const course = await courseService.getCourseBySlug(String(req.params.slug));
  return success(res, course);
}

export async function create(req: Request, res: Response) {
  const course = await courseService.createCourse(req.body, req.user!.id);
  return success(res, course, 201);
}

export async function update(req: Request, res: Response) {
  const course = await courseService.updateCourse(String(req.params.id), req.body);
  return success(res, course);
}

export async function setStatus(req: Request, res: Response) {
  const course = await courseService.setCourseStatus(String(req.params.id), req.body.status);
  return success(res, course);
}
