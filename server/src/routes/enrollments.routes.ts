import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { validate } from "../middleware/validate";
import {
  createEnrollmentSchema,
  updateEnrollmentStatusSchema,
  updateEnrollmentPlanSchema,
} from "../validators/enrollment.validators";
import * as enrollmentController from "../controllers/enrollment.controller";

const router = Router();

router.get("/", authenticate, authorize("enrollment:read"), asyncHandler(enrollmentController.list));
router.post(
  "/",
  authenticate,
  authorize("enrollment:write"),
  validate(createEnrollmentSchema),
  asyncHandler(enrollmentController.create)
);
router.patch(
  "/:id/status",
  authenticate,
  authorize("enrollment:write"),
  validate(updateEnrollmentStatusSchema),
  asyncHandler(enrollmentController.updateStatus)
);
router.patch(
  "/:id/plan",
  authenticate,
  authorize("plan:manage"),
  validate(updateEnrollmentPlanSchema),
  asyncHandler(enrollmentController.updatePlan)
);
router.delete("/:id", authenticate, authorize("enrollment:write"), asyncHandler(enrollmentController.remove));

export default router;
