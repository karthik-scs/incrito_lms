import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { validate } from "../middleware/validate";
import { createAnnouncementSchema } from "../validators/announcement.validators";
import * as announcementController from "../controllers/announcement.controller";

const router = Router();

router.get("/", authenticate, authorize("announcement:write"), asyncHandler(announcementController.list));
router.post(
  "/",
  authenticate,
  authorize("announcement:write"),
  validate(createAnnouncementSchema),
  asyncHandler(announcementController.create)
);
router.delete("/:id", authenticate, authorize("announcement:write"), asyncHandler(announcementController.remove));

export default router;
