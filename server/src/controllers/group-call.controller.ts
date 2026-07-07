import type { Request, Response } from "express";
import { success } from "../utils/apiResponse";
import * as groupCallService from "../services/group-call.service";

export async function mySlots(req: Request, res: Response) {
  return success(res, await groupCallService.listMentorSlots(req.user!.id));
}

export async function availableSlots(req: Request, res: Response) {
  return success(res, await groupCallService.listAvailableSlots(req.user!.id));
}

export async function createSlot(req: Request, res: Response) {
  return success(res, await groupCallService.createSlot(req.user!.id, {
    ...req.body,
    scheduledAt: new Date(req.body.scheduledAt),
  }), 201);
}

export async function updateSlot(req: Request, res: Response) {
  return success(res, await groupCallService.updateSlot(String(req.params.id), req.user!.id, req.body));
}

export async function cancelSlot(req: Request, res: Response) {
  return success(res, await groupCallService.cancelSlot(String(req.params.id), req.user!.id));
}

export async function confirmRequest(req: Request, res: Response) {
  return success(res, await groupCallService.confirmRequest(
    String(req.params.id), String(req.params.requestId), req.user!.id
  ));
}

export async function declineRequest(req: Request, res: Response) {
  return success(res, await groupCallService.declineRequest(
    String(req.params.id), String(req.params.requestId), req.user!.id
  ));
}

export async function requestJoin(req: Request, res: Response) {
  return success(res, await groupCallService.requestJoin(String(req.params.id), req.user!.id), 201);
}

export async function cancelMyRequest(req: Request, res: Response) {
  return success(res, await groupCallService.cancelStudentRequest(String(req.params.id), req.user!.id));
}

export async function myCohorts(req: Request, res: Response) {
  return success(res, await groupCallService.getMentorCohorts(req.user!.id));
}
