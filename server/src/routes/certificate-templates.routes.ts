import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { validate } from "../middleware/validate";
import {
  createCertificateTemplateSchema,
  updateCertificateTemplateSchema,
} from "../validators/certificate-template.validators";
import * as certificateTemplateController from "../controllers/certificate-template.controller";

const router = Router();

router.get("/", authenticate, authorize("certificate:read"), asyncHandler(certificateTemplateController.list));
router.get("/:id", authenticate, authorize("certificate:read"), asyncHandler(certificateTemplateController.get));
router.post(
  "/",
  authenticate,
  authorize("certificate:write"),
  validate(createCertificateTemplateSchema),
  asyncHandler(certificateTemplateController.create)
);
router.patch(
  "/:id",
  authenticate,
  authorize("certificate:write"),
  validate(updateCertificateTemplateSchema),
  asyncHandler(certificateTemplateController.update)
);
router.delete(
  "/:id",
  authenticate,
  authorize("certificate:write"),
  asyncHandler(certificateTemplateController.remove)
);

export default router;
