import type { Request, Response } from "express";
import { success } from "../utils/apiResponse";
import { env } from "../config/env";
import * as liveAccountService from "../services/live-account.service";

export async function list(req: Request, res: Response) {
  const accounts = await liveAccountService.listMyLiveAccounts(req.user!.id);
  return success(res, accounts);
}

export async function connectZoom(req: Request, res: Response) {
  const account = await liveAccountService.connectZoomAccount(req.user!.id, req.body);
  return success(res, account, 201);
}

export async function disconnect(req: Request, res: Response) {
  await liveAccountService.disconnectLiveAccount(req.user!.id, String(req.params.id));
  return success(res, { deleted: true });
}

export async function zohoAuthorize(req: Request, res: Response) {
  const url = await liveAccountService.startZohoConnect(req.user!.id);
  return success(res, { url });
}

/** Zoho redirects the user's browser straight here after consent — no Authorization header, so no `authenticate` middleware. */
export async function zohoCallback(req: Request, res: Response) {
  const code = String(req.query.code ?? "");
  const state = String(req.query.state ?? "");
  const { redirectTo } = code && state
    ? await liveAccountService.completeZohoConnect(code, state)
    : { redirectTo: "error" as const };
  return res.redirect(`${env.frontendUrl}/settings?zoho=${redirectTo}`);
}
