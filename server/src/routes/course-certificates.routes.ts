import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { validate } from "../middleware/validate";
import { createCourseCertificateSchema, updateCourseCertificateSchema } from "../validators/course-certificate.validators";
import * as courseCertificateController from "../controllers/course-certificate.controller";

const router = Router();

// Students need to read these too (to know what's available for their enrolled course) —
// gated by authentication only, not course:write; the actual issuance/eligibility check still
// enforces real enrollment in certificate.service.ts.
router.get("/", authenticate, asyncHandler(courseCertificateController.list));
router.post(
  "/",
  authenticate,
  authorize("course:write"),
  validate(createCourseCertificateSchema),
  asyncHandler(courseCertificateController.create)
);
router.patch(
  "/:id",
  authenticate,
  authorize("course:write"),
  validate(updateCourseCertificateSchema),
  asyncHandler(courseCertificateController.update)
);
router.delete("/:id", authenticate, authorize("course:write"), asyncHandler(courseCertificateController.remove));

export default router;
