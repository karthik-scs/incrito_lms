import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { validate } from "../middleware/validate";
import { createAssessmentSchema, updateAssessmentSchema, submitAttemptSchema } from "../validators/assessment.validators";
import * as assessmentController from "../controllers/assessment.controller";

const router = Router();

router.get("/", authenticate, asyncHandler(assessmentController.list));
router.post(
  "/",
  authenticate,
  authorize("course:write"),
  validate(createAssessmentSchema),
  asyncHandler(assessmentController.create)
);
router.get("/:id/admin", authenticate, authorize("course:write"), asyncHandler(assessmentController.getAdmin));
router.get("/:id", authenticate, asyncHandler(assessmentController.getForAttempt));
router.patch(
  "/:id",
  authenticate,
  authorize("course:write"),
  validate(updateAssessmentSchema),
  asyncHandler(assessmentController.update)
);
router.delete("/:id", authenticate, authorize("course:write"), asyncHandler(assessmentController.remove));

router.post("/:id/attempts", authenticate, asyncHandler(assessmentController.startAttempt));
router.get("/:id/attempts/me", authenticate, asyncHandler(assessmentController.listMyAttempts));
router.patch(
  "/attempts/:attemptId/submit",
  authenticate,
  validate(submitAttemptSchema),
  asyncHandler(assessmentController.submitAttempt)
);

export default router;
