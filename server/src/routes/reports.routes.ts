import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import * as reportsController from "../controllers/reports.controller";

const router = Router();

router.get("/courses", authenticate, authorize("course:read"), asyncHandler(reportsController.courseReport));
router.get("/cohorts", authenticate, authorize("cohort:read"), asyncHandler(reportsController.cohortReport));

export default router;
