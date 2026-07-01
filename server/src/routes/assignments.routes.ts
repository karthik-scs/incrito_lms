import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { validate } from "../middleware/validate";
import {
  createAssignmentSchema,
  updateAssignmentSchema,
  submitAssignmentSchema,
  gradeSubmissionSchema,
} from "../validators/assignment.validators";
import * as assignmentController from "../controllers/assignment.controller";

const router = Router();

router.get("/", authenticate, asyncHandler(assignmentController.list));
router.post(
  "/",
  authenticate,
  authorize("course:write"),
  validate(createAssignmentSchema),
  asyncHandler(assignmentController.create)
);
router.patch(
  "/:id",
  authenticate,
  authorize("course:write"),
  validate(updateAssignmentSchema),
  asyncHandler(assignmentController.update)
);
router.delete("/:id", authenticate, authorize("course:write"), asyncHandler(assignmentController.remove));

router.get("/:id/submissions/me", authenticate, asyncHandler(assignmentController.getMySubmission));
router.get("/:id/submissions", authenticate, authorize("course:write"), asyncHandler(assignmentController.listSubmissions));
router.post(
  "/:id/submissions",
  authenticate,
  validate(submitAssignmentSchema),
  asyncHandler(assignmentController.submit)
);
router.patch(
  "/submissions/:submissionId/grade",
  authenticate,
  authorize("course:write"),
  validate(gradeSubmissionSchema),
  asyncHandler(assignmentController.grade)
);

export default router;
