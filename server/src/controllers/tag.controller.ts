import type { Request, Response } from "express";
import { success } from "../utils/apiResponse";
import * as tagService from "../services/tag.service";

export async function list(_req: Request, res: Response) {
  const tags = await tagService.listTags();
  return success(res, tags);
}

export async function create(req: Request, res: Response) {
  const tag = await tagService.createTag(req.body);
  return success(res, tag, 201);
}

export async function update(req: Request, res: Response) {
  const tag = await tagService.updateTag(String(req.params.id), req.body);
  return success(res, tag);
}

export async function remove(req: Request, res: Response) {
  await tagService.deleteTag(String(req.params.id));
  return success(res, { deleted: true });
}
