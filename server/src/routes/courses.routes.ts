import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate } from "../middleware/authenticate";
import { optionalAuthenticate } from "../middleware/optionalAuthenticate";
import { authorize } from "../middleware/authorize";
import { validate } from "../middleware/validate";
import { createCourseSchema, updateCourseSchema, publishCourseSchema } from "../validators/course.validators";
import * as courseController from "../controllers/course.controller";

const router = Router();

router.get("/", optionalAuthenticate, asyncHandler(courseController.list));
router.get("/:slug", asyncHandler(courseController.getBySlug));
router.post(
  "/",
  authenticate,
  authorize("course:write"),
  validate(createCourseSchema),
  asyncHandler(courseController.create)
);
router.patch(
  "/:id",
  authenticate,
  authorize("course:write"),
  validate(updateCourseSchema),
  asyncHandler(courseController.update)
);
router.patch(
  "/:id/status",
  authenticate,
  authorize("course:publish"),
  validate(publishCourseSchema),
  asyncHandler(courseController.setStatus)
);

export default router;
