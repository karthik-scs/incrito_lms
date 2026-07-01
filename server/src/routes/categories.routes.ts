import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { validate } from "../middleware/validate";
import { createCategorySchema, updateCategorySchema } from "../validators/category.validators";
import * as categoryController from "../controllers/category.controller";

const router = Router();

router.get("/", asyncHandler(categoryController.list));
router.post(
  "/",
  authenticate,
  authorize("category:write"),
  validate(createCategorySchema),
  asyncHandler(categoryController.create)
);
router.patch(
  "/:id",
  authenticate,
  authorize("category:write"),
  validate(updateCategorySchema),
  asyncHandler(categoryController.update)
);
router.delete("/:id", authenticate, authorize("category:write"), asyncHandler(categoryController.remove));

export default router;
