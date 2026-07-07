import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import * as storageController from "../controllers/storage.controller";

const router = Router();
router.use(authenticate);

// Admin endpoints
router.get("/admin", authorize("user:write"), asyncHandler(storageController.adminList));
router.get("/admin/users/:userId/files", authorize("user:write"), asyncHandler(storageController.adminUserFiles));
router.patch("/admin/users/:userId/limit", authorize("user:write"), asyncHandler(storageController.adminSetLimit));
router.delete("/admin/files/:id", authorize("user:write"), asyncHandler(storageController.adminDeleteFile));

// User self-service
router.get("/me", asyncHandler(storageController.myUsage));
router.delete("/me/files/:id", asyncHandler(storageController.myDeleteFile));

export default router;
