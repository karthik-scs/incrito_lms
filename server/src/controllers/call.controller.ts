import type { Request, Response } from "express";
import { success } from "../utils/apiResponse";
import * as callService from "../services/call.service";

export async function initiateCall(req: Request, res: Response) {
  return success(res, await callService.initiateCall(
    req.user!.id, req.body.calleeId, req.body.callType, req.body.offerSdp
  ), 201);
}

export async function pollIncoming(req: Request, res: Response) {
  return success(res, await callService.pollIncomingCall(req.user!.id));
}

export async function getSession(req: Request, res: Response) {
  return success(res, await callService.getCallSession(String(req.params.id), req.user!.id));
}

export async function acceptCall(req: Request, res: Response) {
  return success(res, await callService.acceptCall(String(req.params.id), req.user!.id, req.body.answerSdp));
}

export async function declineCall(req: Request, res: Response) {
  return success(res, await callService.declineCall(String(req.params.id), req.user!.id));
}

export async function endCall(req: Request, res: Response) {
  return success(res, await callService.endCall(String(req.params.id), req.user!.id));
}

export async function addIceCandidates(req: Request, res: Response) {
  return success(res, await callService.addIceCandidates(String(req.params.id), req.user!.id, req.body.candidates));
}
