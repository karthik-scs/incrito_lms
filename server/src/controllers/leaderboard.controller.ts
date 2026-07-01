import type { Request, Response } from "express";
import { success } from "../utils/apiResponse";
import * as leaderboardService from "../services/leaderboard.service";

export async function list(req: Request, res: Response) {
  const cohortId = String(req.query.cohortId ?? "");
  const leaderboard = await leaderboardService.getLeaderboard(cohortId);
  return success(res, leaderboard);
}
