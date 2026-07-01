import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { validate } from "../middleware/validate";
import { createRoleSchema, updateRoleSchema, updatePermissionsSchema } from "../validators/role.validators";
import * as roleController from "../controllers/role.controller";

const router = Router();

router.get("/", authenticate, authorize("role:read"), asyncHandler(roleController.list));
router.get("/permissions", authenticate, authorize("role:read"), asyncHandler(roleController.listPermissions));
router.post(
  "/",
  authenticate,
  authorize("role:write"),
  validate(createRoleSchema),
  asyncHandler(roleController.create)
);
router.patch(
  "/:id",
  authenticate,
  authorize("role:write"),
  validate(updateRoleSchema),
  asyncHandler(roleController.update)
);
router.patch(
  "/:id/permissions",
  authenticate,
  authorize("role:write"),
  validate(updatePermissionsSchema),
  asyncHandler(roleController.updatePermissions)
);
router.delete("/:id", authenticate, authorize("role:write"), asyncHandler(roleController.remove));

export default router;
