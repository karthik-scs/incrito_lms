import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import * as zoomWebhookController from "../controllers/zoomWebhook.controller";

const router = Router();

// Public — Zoom calls this directly, no LMS session exists. Authenticity is established by
// verifying the per-account HMAC signature inside the controller, not by `authenticate`.
router.post("/", asyncHandler(zoomWebhookController.receive));

export default router;
