import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { validate } from "../middleware/validate";
import { updateSettingsSchema } from "../validators/settings.validators";
import * as settingsController from "../controllers/settings.controller";

const router = Router();

router.get("/public", asyncHandler(settingsController.getPublic));
router.get("/", authenticate, authorize("settings:read"), asyncHandler(settingsController.get));
router.patch(
  "/",
  authenticate,
  authorize("settings:write"),
  validate(updateSettingsSchema),
  asyncHandler(settingsController.update)
);
router.post("/test-email", authenticate, authorize("settings:write"), asyncHandler(settingsController.testEmail));

export default router;
