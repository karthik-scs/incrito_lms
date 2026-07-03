import type { Request, Response } from "express";
import { success } from "../utils/apiResponse";
import * as userService from "../services/user.service";

export async function list(_req: Request, res: Response) {
  const users = await userService.listUsers();
  return success(res, users);
}

export async function create(req: Request, res: Response) {
  const user = await userService.createUser(req.body);
  return success(res, user, 201);
}

export async function get(req: Request, res: Response) {
  const user = await userService.getUser(String(req.params.id));
  return success(res, user);
}

export async function updateStatus(req: Request, res: Response) {
  const user = await userService.updateUserStatus(String(req.params.id), req.body.status);
  return success(res, user);
}

export async function updateRole(req: Request, res: Response) {
  const user = await userService.updateUserRole(String(req.params.id), req.body.roleId);
  return success(res, user);
}

export async function update(req: Request, res: Response) {
  const user = await userService.updateUser(String(req.params.id), req.body);
  return success(res, user);
}

export async function remove(req: Request, res: Response) {
  await userService.deleteUser(String(req.params.id));
  return success(res, null, 204);
}
