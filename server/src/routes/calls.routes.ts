import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate } from "../middleware/authenticate";
import { validate } from "../middleware/validate";
import { initiateCallSchema, acceptCallSchema, iceCandidatesSchema } from "../validators/call.validators";
import * as callController from "../controllers/call.controller";

const router = Router();
router.use(authenticate);

router.post("/",              validate(initiateCallSchema),  asyncHandler(callController.initiateCall));
router.get("/incoming",                                      asyncHandler(callController.pollIncoming));
router.get("/:id",                                           asyncHandler(callController.getSession));
router.post("/:id/accept",   validate(acceptCallSchema),     asyncHandler(callController.acceptCall));
router.post("/:id/decline",                                  asyncHandler(callController.declineCall));
router.post("/:id/end",                                      asyncHandler(callController.endCall));
router.post("/:id/ice",      validate(iceCandidatesSchema),  asyncHandler(callController.addIceCandidates));

export default router;
