import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { validate } from "../middleware/validate";
import { createPostSchema, createCommentSchema, editCommentSchema, reactSchema } from "../validators/discussion.validators";
import * as discussionController from "../controllers/discussion.controller";

const router = Router();

router.get("/", authenticate, authorize("community:read"), asyncHandler(discussionController.list));
router.post("/", authenticate, authorize("community:write"), validate(createPostSchema), asyncHandler(discussionController.create));
router.get("/:id", authenticate, authorize("community:read"), asyncHandler(discussionController.get));
router.delete("/:id", authenticate, authorize("community:write"), asyncHandler(discussionController.remove));
router.post("/:id/comments", authenticate, authorize("community:write"), validate(createCommentSchema), asyncHandler(discussionController.addComment));
router.post("/:id/react", authenticate, authorize("community:write"), validate(reactSchema), asyncHandler(discussionController.setReaction));

// Comments — edit/delete must come BEFORE the /:commentId/react route to avoid ambiguity
router.patch("/comments/:commentId", authenticate, authorize("community:write"), validate(editCommentSchema), asyncHandler(discussionController.editComment));
router.delete("/comments/:commentId", authenticate, authorize("community:write"), asyncHandler(discussionController.deleteComment));
router.post("/comments/:commentId/react", authenticate, authorize("community:write"), validate(reactSchema), asyncHandler(discussionController.setCommentReaction));

export default router;
