import type { Request, Response } from "express";
import { success } from "../utils/apiResponse";
import * as pollService from "../services/poll.service";

export async function list(req: Request, res: Response) {
  const polls = await pollService.listPolls(String(req.params.id), req.user!.id);
  return success(res, polls);
}

export async function create(req: Request, res: Response) {
  const poll = await pollService.createPoll(String(req.params.id), req.user!.id, req.body);
  return success(res, poll, 201);
}

export async function vote(req: Request, res: Response) {
  await pollService.vote(String(req.params.pollId), req.body.optionId, req.user!.id);
  return success(res, { voted: true });
}

export async function remove(req: Request, res: Response) {
  const isAdmin = req.user!.roleName === "Admin";
  await pollService.deletePoll(String(req.params.pollId), req.user!.id, isAdmin);
  return success(res, { deleted: true });
}
