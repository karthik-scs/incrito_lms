import type { Request, Response } from "express";
import { success } from "../utils/apiResponse";
import * as categoryService from "../services/category.service";

export async function list(_req: Request, res: Response) {
  const categories = await categoryService.listCategories();
  return success(res, categories);
}

export async function create(req: Request, res: Response) {
  const category = await categoryService.createCategory(req.body);
  return success(res, category, 201);
}

export async function update(req: Request, res: Response) {
  const category = await categoryService.updateCategory(String(req.params.id), req.body);
  return success(res, category);
}

export async function remove(req: Request, res: Response) {
  await categoryService.deleteCategory(String(req.params.id));
  return success(res, { deleted: true });
}
