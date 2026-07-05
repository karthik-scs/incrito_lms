import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate } from "../middleware/authenticate";
import * as liveAccountController from "../controllers/live-account.controller";

const router = Router();

router.get("/", authenticate, asyncHandler(liveAccountController.list));
router.delete("/:id", authenticate, asyncHandler(liveAccountController.disconnect));
router.get("/zoho/authorize", authenticate, asyncHandler(liveAccountController.zohoAuthorize));
// No `authenticate` — Zoho redirects the browser here directly, with no Authorization header.
router.get("/zoho/callback", asyncHandler(liveAccountController.zohoCallback));

export default router;
