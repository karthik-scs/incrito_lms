import type { Request, Response } from "express";
import { success } from "../utils/apiResponse";
import * as whatsappService from "../services/whatsapp.service";

function redact(settings: Awaited<ReturnType<typeof whatsappService.getSettings>>) {
  const { accessToken, ...rest } = settings;
  return { ...rest, accessTokenSet: Boolean(accessToken) };
}

export async function getSettings(_req: Request, res: Response) {
  const settings = await whatsappService.getSettings();
  return success(res, redact(settings));
}

export async function updateSettings(req: Request, res: Response) {
  const settings = await whatsappService.updateSettings(req.body);
  return success(res, redact(settings));
}

export async function listTemplates(_req: Request, res: Response) {
  const templates = await whatsappService.listTemplates();
  return success(res, templates);
}

export async function createTemplate(req: Request, res: Response) {
  const template = await whatsappService.createTemplate(req.body);
  return success(res, template, 201);
}

export async function updateTemplate(req: Request, res: Response) {
  const template = await whatsappService.updateTemplate(String(req.params.id), req.body);
  return success(res, template);
}

export async function updateTemplateStatus(req: Request, res: Response) {
  const template = await whatsappService.updateTemplateStatus(String(req.params.id), req.body.status);
  return success(res, template);
}

export async function deleteTemplate(req: Request, res: Response) {
  await whatsappService.deleteTemplate(String(req.params.id));
  return success(res, { deleted: true });
}
