import type { Request, Response } from "express";
import { success } from "../utils/apiResponse";
import * as roleService from "../services/role.service";

export async function list(_req: Request, res: Response) {
  const roles = await roleService.listRoles();
  return success(res, roles);
}

export async function listPermissions(_req: Request, res: Response) {
  const permissions = await roleService.listPermissions();
  return success(res, permissions);
}

export async function create(req: Request, res: Response) {
  const role = await roleService.createCustomRole(req.body);
  return success(res, role, 201);
}

export async function updatePermissions(req: Request, res: Response) {
  const role = await roleService.updateRolePermissions(String(req.params.id), req.body.permissionKeys);
  return success(res, role);
}

export async function update(req: Request, res: Response) {
  const role = await roleService.updateRole(String(req.params.id), req.body);
  return success(res, role);
}

export async function remove(req: Request, res: Response) {
  await roleService.deleteRole(String(req.params.id));
  return success(res, { deleted: true });
}
