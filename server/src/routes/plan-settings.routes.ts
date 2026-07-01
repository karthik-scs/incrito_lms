import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { validate } from "../middleware/validate";
import { createPlanSettingSchema, updatePlanSettingSchema } from "../validators/plan-setting.validators";
import * as planSettingController from "../controllers/plan-setting.controller";

const router = Router();

router.get("/", authenticate, authorize("plan:manage"), asyncHandler(planSettingController.list));
router.post(
  "/",
  authenticate,
  authorize("plan:manage"),
  validate(createPlanSettingSchema),
  asyncHandler(planSettingController.create)
);
router.patch(
  "/:plan",
  authenticate,
  authorize("plan:manage"),
  validate(updatePlanSettingSchema),
  asyncHandler(planSettingController.update)
);
router.delete(
  "/:plan",
  authenticate,
  authorize("plan:manage"),
  asyncHandler(planSettingController.remove)
);

export default router;
