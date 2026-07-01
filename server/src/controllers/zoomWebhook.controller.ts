import type { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { computeSignature, handleUrlValidation, processZoomEvent } from "../services/zoomWebhook.service";

export async function receive(req: Request, res: Response) {
  const accountId = String(req.query.account ?? "");
  const account = accountId ? await prisma.zoomAccount.findUnique({ where: { id: accountId } }) : null;

  if (!account) {
    return res.status(404).json({ message: "Unknown Zoom account — check the webhook URL's ?account= id." });
  }

  if (req.body?.event === "endpoint.url_validation") {
    return res.status(200).json(handleUrlValidation(account.secretToken, req.body.payload.plainToken));
  }

  const timestamp = String(req.header("x-zm-request-timestamp") ?? "");
  const signature = String(req.header("x-zm-signature") ?? "");
  const rawBody = req.rawBody?.toString("utf8") ?? "";
  const expected = computeSignature(account.secretToken, timestamp, rawBody);

  if (signature !== expected) {
    return res.status(401).json({ message: "Invalid webhook signature" });
  }

  res.status(200).json({ received: true });
  await processZoomEvent(req.body);
}
