import type { Request, Response } from "express";
import { success } from "../utils/apiResponse";
import * as moduleService from "../services/module.service";

export async function list(req: Request, res: Response) {
  const cohortId = String(req.query.cohortId ?? "");
  if (!cohortId) return success(res, []);
  const modules = await moduleService.listModules(cohortId);
  return success(res, modules);
}

export async function create(req: Request, res: Response) {
  const module = await moduleService.createModule({
    ...req.body,
    callerUserId: req.user!.id,
    callerRoleName: req.user!.roleName,
  });
  return success(res, module, 201);
}

export async function update(req: Request, res: Response) {
  const module = await moduleService.updateModule(String(req.params.id), req.body);
  return success(res, module);
}

export async function remove(req: Request, res: Response) {
  await moduleService.deleteModule(String(req.params.id));
  return success(res, { deleted: true });
}

export async function reorder(req: Request, res: Response) {
  const modules = await moduleService.reorderModules(req.body.cohortId, req.body.orderedIds);
  return success(res, modules);
}
