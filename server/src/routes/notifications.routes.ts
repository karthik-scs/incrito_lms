import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate } from "../middleware/authenticate";
import * as notificationController from "../controllers/notification.controller";

const router = Router();

router.get("/", authenticate, asyncHandler(notificationController.list));
router.patch("/read-all", authenticate, asyncHandler(notificationController.markAllRead));
router.patch("/:id/read", authenticate, asyncHandler(notificationController.markRead));
router.delete("/:id", authenticate, asyncHandler(notificationController.remove));

export default router;
