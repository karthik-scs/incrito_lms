import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate } from "../middleware/authenticate";
import { validate } from "../middleware/validate";
import { updateNotificationPreferenceSchema } from "../validators/notification-preference.validators";
import * as notificationPreferenceController from "../controllers/notification-preference.controller";

const router = Router();

router.get("/", authenticate, asyncHandler(notificationPreferenceController.get));
router.patch(
  "/",
  authenticate,
  validate(updateNotificationPreferenceSchema),
  asyncHandler(notificationPreferenceController.update)
);

export default router;
