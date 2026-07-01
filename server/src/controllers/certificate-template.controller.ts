import type { Request, Response } from "express";
import { success } from "../utils/apiResponse";
import * as certificateTemplateService from "../services/certificate-template.service";

export async function list(_req: Request, res: Response) {
  const templates = await certificateTemplateService.listCertificateTemplates();
  return success(res, templates);
}

export async function get(req: Request, res: Response) {
  const template = await certificateTemplateService.getCertificateTemplate(String(req.params.id));
  return success(res, template);
}

export async function create(req: Request, res: Response) {
  const template = await certificateTemplateService.createCertificateTemplate(req.body);
  return success(res, template, 201);
}

export async function update(req: Request, res: Response) {
  const template = await certificateTemplateService.updateCertificateTemplate(String(req.params.id), req.body);
  return success(res, template);
}

export async function remove(req: Request, res: Response) {
  await certificateTemplateService.deleteCertificateTemplate(String(req.params.id));
  return success(res, { deleted: true });
}
