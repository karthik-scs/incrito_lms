import type { Request, Response } from "express";
import { success } from "../utils/apiResponse";
import * as planSettingService from "../services/plan-setting.service";

export async function list(_req: Request, res: Response) {
  const settings = await planSettingService.listPlanSettings();
  return success(res, settings);
}

export async function create(req: Request, res: Response) {
  const setting = await planSettingService.createPlanSetting(req.body);
  return success(res, setting, 201);
}

export async function update(req: Request, res: Response) {
  const plan = String(req.params.plan);
  const setting = await planSettingService.updatePlanSetting(plan, req.body);
  return success(res, setting);
}

export async function remove(req: Request, res: Response) {
  const plan = String(req.params.plan);
  await planSettingService.deletePlanSetting(plan);
  return success(res, { deleted: true });
}
