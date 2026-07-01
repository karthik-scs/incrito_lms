import type { Request, Response } from "express";
import { success } from "../utils/apiResponse";
import { AppError } from "../utils/AppError";
import * as certificateService from "../services/certificate.service";

export async function listMine(req: Request, res: Response) {
  const certificates = await certificateService.listMyCertificates(req.user!.id);
  return success(res, certificates);
}

export async function eligibility(req: Request, res: Response) {
  const cohortId = String(req.query.cohortId ?? "");
  const result = await certificateService.getEligibilityList(req.user!.id, cohortId);
  return success(res, result);
}

export async function issue(req: Request, res: Response) {
  const certificate = await certificateService.issueCertificate(req.user!.id, req.body.cohortId, req.body.courseCertificateId);
  return success(res, certificate, 201);
}

export async function verify(req: Request, res: Response) {
  const certificate = await certificateService.verifyCertificate(String(req.params.token));
  if (!certificate) {
    throw new AppError("Certificate not found or invalid", 404);
  }
  return success(res, certificate);
}
