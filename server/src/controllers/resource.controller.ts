import type { Request, Response } from "express";
import { success } from "../utils/apiResponse";
import * as resourceService from "../services/resource.service";
import { getWatermarkedPdf } from "../services/pdfWatermark.service";

export async function list(req: Request, res: Response) {
  const lessonId = String(req.query.lessonId ?? "");
  const resources = await resourceService.listResources(lessonId);
  return success(res, resources);
}

export async function create(req: Request, res: Response) {
  const resource = await resourceService.createResource(req.body);
  return success(res, resource, 201);
}

export async function update(req: Request, res: Response) {
  const resource = await resourceService.updateResource(String(req.params.id), req.body);
  return success(res, resource);
}

export async function remove(req: Request, res: Response) {
  await resourceService.deleteResource(String(req.params.id));
  return success(res, { deleted: true });
}

export async function signedUrl(req: Request, res: Response) {
  const url = await resourceService.getResourceSignedUrl(String(req.params.id), req.user!.id);
  return success(res, { url });
}

export async function watermarkedPdf(req: Request, res: Response) {
  const pdfBuffer = await getWatermarkedPdf(String(req.params.id), req.user!.id);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", "inline");
  res.setHeader("Cache-Control", "private, no-store");
  res.end(pdfBuffer);
}
