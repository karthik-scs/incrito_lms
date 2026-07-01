import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate } from "../middleware/authenticate";
import * as leaderboardController from "../controllers/leaderboard.controller";

const router = Router();

router.get("/", authenticate, asyncHandler(leaderboardController.list));

export default router;
