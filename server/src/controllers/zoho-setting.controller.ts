import type { Request, Response } from "express";
import { success } from "../utils/apiResponse";
import * as service from "../services/zoho-setting.service";

export async function get(_req: Request, res: Response) {
  return success(res, await service.getSettings());
}

export async function update(req: Request, res: Response) {
  return success(res, await service.updateSettings(req.body));
}
