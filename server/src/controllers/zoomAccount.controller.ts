import type { Request, Response } from "express";
import { success } from "../utils/apiResponse";
import { env } from "../config/env";
import * as zoomAccountService from "../services/zoomAccount.service";

type RawAccount = Awaited<ReturnType<typeof zoomAccountService.listZoomAccounts>>[number];

/** Secrets never round-trip to the client — only a `*Set` boolean, same pattern as SMTP/WhatsApp settings. */
function redact(account: RawAccount) {
  const { clientSecret, secretToken, sdkSecret, ...rest } = account;
  return {
    ...rest,
    clientSecretSet: Boolean(clientSecret),
    secretTokenSet: Boolean(secretToken),
    sdkSecretSet: Boolean(sdkSecret),
    sdkConfigured: Boolean(account.sdkKey && sdkSecret),
    /** Paste this exact URL into this account's Zoom App → Event Subscriptions webhook config. */
    webhookUrl: `${env.publicWebhookUrl}/api/webhooks/zoom?account=${account.id}`,
  };
}

export async function list(_req: Request, res: Response) {
  const accounts = await zoomAccountService.listZoomAccounts();
  return success(res, accounts.map(redact));
}

export async function create(req: Request, res: Response) {
  const account = await zoomAccountService.createZoomAccount(req.body);
  return success(res, redact(account), 201);
}

export async function update(req: Request, res: Response) {
  const account = await zoomAccountService.updateZoomAccount(String(req.params.id), req.body);
  return success(res, redact(account));
}

export async function remove(req: Request, res: Response) {
  await zoomAccountService.deleteZoomAccount(String(req.params.id));
  return success(res, { deleted: true });
}
