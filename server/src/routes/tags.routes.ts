import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { validate } from "../middleware/validate";
import { createTagSchema, updateTagSchema } from "../validators/tag.validators";
import * as tagController from "../controllers/tag.controller";

const router = Router();

router.get("/", asyncHandler(tagController.list));
router.post("/", authenticate, authorize("tag:write"), validate(createTagSchema), asyncHandler(tagController.create));
router.patch(
  "/:id",
  authenticate,
  authorize("tag:write"),
  validate(updateTagSchema),
  asyncHandler(tagController.update)
);
router.delete("/:id", authenticate, authorize("tag:write"), asyncHandler(tagController.remove));

export default router;
