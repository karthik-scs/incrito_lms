import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { validate } from "../middleware/validate";
import { createZoomAccountSchema, updateZoomAccountSchema } from "../validators/zoomAccount.validators";
import * as zoomAccountController from "../controllers/zoomAccount.controller";

const router = Router();

router.get("/", authenticate, authorize("settings:read"), asyncHandler(zoomAccountController.list));
router.post(
  "/",
  authenticate,
  authorize("settings:write"),
  validate(createZoomAccountSchema),
  asyncHandler(zoomAccountController.create)
);
router.patch(
  "/:id",
  authenticate,
  authorize("settings:write"),
  validate(updateZoomAccountSchema),
  asyncHandler(zoomAccountController.update)
);
router.delete("/:id", authenticate, authorize("settings:write"), asyncHandler(zoomAccountController.remove));

export default router;
