import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { validate } from "../middleware/validate";
import { createUserSchema, updateUserStatusSchema, updateUserRoleSchema, updateUserSchema } from "../validators/user.validators";
import * as userController from "../controllers/user.controller";

const router = Router();

router.get("/", authenticate, authorize("user:read"), asyncHandler(userController.list));
router.post(
  "/",
  authenticate,
  authorize("user:write"),
  validate(createUserSchema),
  asyncHandler(userController.create)
);
router.get("/:id", authenticate, authorize("user:read"), asyncHandler(userController.get));
router.patch(
  "/:id/status",
  authenticate,
  authorize("user:write"),
  validate(updateUserStatusSchema),
  asyncHandler(userController.updateStatus)
);
router.patch(
  "/:id/role",
  authenticate,
  authorize("user:write"),
  validate(updateUserRoleSchema),
  asyncHandler(userController.updateRole)
);
router.patch(
  "/:id",
  authenticate,
  authorize("user:write"),
  validate(updateUserSchema),
  asyncHandler(userController.update)
);
router.delete("/:id", authenticate, authorize("user:write"), asyncHandler(userController.remove));

export default router;
