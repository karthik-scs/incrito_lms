import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { validate } from "../middleware/validate";
import { updateZohoSettingSchema } from "../validators/zoho-setting.validators";
import * as controller from "../controllers/zoho-setting.controller";

const router = Router();

router.get("/", authenticate, authorize("settings:read"), asyncHandler(controller.get));
router.patch("/", authenticate, authorize("settings:write"), validate(updateZohoSettingSchema), asyncHandler(controller.update));

export default router;
