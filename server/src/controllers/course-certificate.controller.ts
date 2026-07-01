import type { Request, Response } from "express";
import { success } from "../utils/apiResponse";
import * as courseCertificateService from "../services/course-certificate.service";

export async function list(req: Request, res: Response) {
  const courseId = String(req.query.courseId ?? "");
  const courseCertificates = await courseCertificateService.listCourseCertificates(courseId);
  return success(res, courseCertificates);
}

export async function create(req: Request, res: Response) {
  const courseCertificate = await courseCertificateService.createCourseCertificate(req.body);
  return success(res, courseCertificate, 201);
}

export async function update(req: Request, res: Response) {
  const courseCertificate = await courseCertificateService.updateCourseCertificate(String(req.params.id), req.body);
  return success(res, courseCertificate);
}

export async function remove(req: Request, res: Response) {
  await courseCertificateService.deleteCourseCertificate(String(req.params.id));
  return success(res, { deleted: true });
}
