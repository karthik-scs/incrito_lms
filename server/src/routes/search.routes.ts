import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate } from "../middleware/authenticate";
import * as searchController from "../controllers/search.controller";

const router = Router();

router.get("/", authenticate, asyncHandler(searchController.search));

export default router;
