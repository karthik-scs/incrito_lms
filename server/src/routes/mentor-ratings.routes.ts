import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate } from "../middleware/authenticate";
import { validate } from "../middleware/validate";
import { submitRatingSchema } from "../validators/mentor-rating.validators";
import * as ratingController from "../controllers/mentor-rating.controller";

const router = Router();
router.use(authenticate);

router.post("/",                           validate(submitRatingSchema), asyncHandler(ratingController.submitRating));
router.get("/me",                          asyncHandler(ratingController.myRatings));
router.get("/:mentorId",                   asyncHandler(ratingController.getMentorRatings));

export default router;
