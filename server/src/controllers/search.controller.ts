import type { Request, Response } from "express";
import { success } from "../utils/apiResponse";
import * as searchService from "../services/search.service";

export async function search(req: Request, res: Response) {
  const q = String(req.query.q ?? "");
  const results = await searchService.globalSearch(q, req.user!.id, req.user!.roleName);
  return success(res, results);
}
