import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate } from "../middleware/authenticate";
import * as ctrl from "../controllers/group-call.controller";

const router = Router();
router.use(authenticate);

// Mentor: manage their own slots
router.get("/my-slots", asyncHandler(ctrl.mySlots));
router.get("/my-cohorts", asyncHandler(ctrl.myCohorts));
router.post("/", asyncHandler(ctrl.createSlot));
router.patch("/:id", asyncHandler(ctrl.updateSlot));
router.delete("/:id", asyncHandler(ctrl.cancelSlot));

// Mentor: manage requests on a slot
router.patch("/:id/requests/:requestId/confirm", asyncHandler(ctrl.confirmRequest));
router.patch("/:id/requests/:requestId/decline", asyncHandler(ctrl.declineRequest));

// Student: browse open slots + join/cancel
router.get("/available", asyncHandler(ctrl.availableSlots));
router.post("/:id/join", asyncHandler(ctrl.requestJoin));
router.delete("/:id/join", asyncHandler(ctrl.cancelMyRequest));

export default router;
