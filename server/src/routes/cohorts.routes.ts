import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { validate } from "../middleware/validate";
import {
  createCohortSchema,
  updateCohortSchema,
  assignCohortMentorSchema,
  assignCohortManagerSchema,
} from "../validators/cohort.validators";
import * as cohortController from "../controllers/cohort.controller";

const router = Router();

router.get("/", authenticate, authorize("cohort:read"), asyncHandler(cohortController.list));
router.get("/stats", authenticate, authorize("cohort:read"), asyncHandler(cohortController.stats));
router.get("/:id", authenticate, authorize("cohort:read"), asyncHandler(cohortController.get));
router.post(
  "/",
  authenticate,
  authorize("cohort:write"),
  validate(createCohortSchema),
  asyncHandler(cohortController.create)
);
router.patch(
  "/:id",
  authenticate,
  authorize("cohort:write"),
  validate(updateCohortSchema),
  asyncHandler(cohortController.update)
);
router.post(
  "/:id/mentors",
  authenticate,
  authorize("cohort:write"),
  validate(assignCohortMentorSchema),
  asyncHandler(cohortController.addMentor)
);
router.delete(
  "/:id/mentors/:userId",
  authenticate,
  authorize("cohort:write"),
  asyncHandler(cohortController.removeMentor)
);
router.post(
  "/:id/managers",
  authenticate,
  authorize("cohort:write"),
  validate(assignCohortManagerSchema),
  asyncHandler(cohortController.addManager)
);
router.delete(
  "/:id/managers/:userId",
  authenticate,
  authorize("cohort:write"),
  asyncHandler(cohortController.removeManager)
);
router.get("/:id/progress", authenticate, authorize("cohort:read"), asyncHandler(cohortController.progress));
// No `cohort:read` gate — students (who lack that permission) need this for @mention autocomplete
// in their cohort's discussion; access itself is enforced inside the service (member or Admin only).
router.get("/:id/members", authenticate, asyncHandler(cohortController.members));

export default router;
