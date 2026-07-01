import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate } from "../middleware/authenticate";
import * as progressController from "../controllers/progress.controller";
import * as calendarController from "../controllers/calendar.controller";
import * as dashboardController from "../controllers/dashboard.controller";

const router = Router();

router.get("/courses", authenticate, asyncHandler(progressController.myCourses));
router.get("/points", authenticate, asyncHandler(progressController.myPoints));
router.get("/courses/:slug/roadmap", authenticate, asyncHandler(progressController.courseRoadmap));
router.get("/courses/:courseId/activity", authenticate, asyncHandler(progressController.recentActivity));
router.get("/calendar", authenticate, asyncHandler(calendarController.list));
router.get("/dashboard", authenticate, asyncHandler(dashboardController.getMyDashboard));

export default router;
