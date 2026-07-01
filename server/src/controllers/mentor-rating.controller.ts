import type { Request, Response } from "express";
import { success } from "../utils/apiResponse";
import * as ratingService from "../services/mentor-rating.service";

export async function submitRating(req: Request, res: Response) {
  return success(res, await ratingService.submitRating(req.user!.id, req.body), 201);
}

export async function getMentorRatings(req: Request, res: Response) {
  return success(res, await ratingService.getMentorRatingSummary(String(req.params.mentorId)));
}

export async function myRatings(req: Request, res: Response) {
  return success(res, await ratingService.getMentorRatingSummary(req.user!.id));
}
