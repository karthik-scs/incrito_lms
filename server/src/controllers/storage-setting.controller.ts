import type { Request, Response } from "express";
import { success } from "../utils/apiResponse";
import * as service from "../services/storage-setting.service";
import { invalidateS3Cache } from "../lib/s3";

export async function get(_req: Request, res: Response) {
  return success(res, await service.getSettings());
}

export async function update(req: Request, res: Response) {
  const settings = await service.updateSettings(req.body);
  invalidateS3Cache();
  return success(res, settings);
}
