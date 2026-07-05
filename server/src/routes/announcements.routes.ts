import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate } from "../middleware/authenticate";
import { validate } from "../middleware/validate";
import { createAnnouncementSchema } from "../validators/announcement.validators";
import * as announcementController from "../controllers/announcement.controller";

const router = Router();

router.get("/", authenticate, asyncHandler(announcementController.list));
router.post("/", authenticate, validate(createAnnouncementSchema), asyncHandler(announcementController.create));
router.delete("/:id", authenticate, asyncHandler(announcementController.remove));

export default router;
