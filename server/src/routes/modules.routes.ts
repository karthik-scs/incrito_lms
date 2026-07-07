import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate } from "../middleware/authenticate";
import { validate } from "../middleware/validate";
import { createModuleSchema, updateModuleSchema, reorderModulesSchema } from "../validators/module.validators";
import * as moduleController from "../controllers/module.controller";

const router = Router();

router.get("/", asyncHandler(moduleController.list));
router.post(
  "/",
  authenticate,
  validate(createModuleSchema),
  asyncHandler(moduleController.create)
);
router.patch(
  "/reorder",
  authenticate,
  validate(reorderModulesSchema),
  asyncHandler(moduleController.reorder)
);
router.patch(
  "/:id",
  authenticate,
  validate(updateModuleSchema),
  asyncHandler(moduleController.update)
);
router.delete("/:id", authenticate, asyncHandler(moduleController.remove));

export default router;
