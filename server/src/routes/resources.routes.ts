import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { validate } from "../middleware/validate";
import { createResourceSchema, updateResourceSchema } from "../validators/resource.validators";
import * as resourceController from "../controllers/resource.controller";

const router = Router();

router.get("/", authenticate, asyncHandler(resourceController.list));
router.post(
  "/",
  authenticate,
  authorize("course:write"),
  validate(createResourceSchema),
  asyncHandler(resourceController.create)
);
router.patch(
  "/:id",
  authenticate,
  authorize("course:write"),
  validate(updateResourceSchema),
  asyncHandler(resourceController.update)
);
router.delete("/:id", authenticate, authorize("course:write"), asyncHandler(resourceController.remove));
router.get("/:id/signed-url", authenticate, asyncHandler(resourceController.signedUrl));
router.get("/:id/watermarked-pdf", authenticate, asyncHandler(resourceController.watermarkedPdf));

export default router;
