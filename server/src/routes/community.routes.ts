import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { validate } from "../middleware/validate";
import {
  createCommunitySchema,
  updateCommunitySchema,
  addMemberSchema,
  createCommunityPostSchema,
  createCommunityCommentSchema,
  editCommentSchema,
  reactSchema,
} from "../validators/community.validators";
import { createPollSchema, voteSchema } from "../validators/poll.validators";
import { createCommunityEventSchema } from "../validators/community-event.validators";
import * as ctrl from "../controllers/community.controller";
import * as pollCtrl from "../controllers/poll.controller";
import * as eventCtrl from "../controllers/community-event.controller";

const router = Router();

// Community CRUD — list/get open to any authenticated member; create/update/delete requires community:manage
router.get("/", authenticate, authorize("community:read"), asyncHandler(ctrl.list));
router.post("/", authenticate, authorize("community:manage"), validate(createCommunitySchema), asyncHandler(ctrl.create));
router.get("/:id", authenticate, authorize("community:read"), asyncHandler(ctrl.get));
router.patch("/:id", authenticate, authorize("community:manage"), validate(updateCommunitySchema), asyncHandler(ctrl.update));
router.delete("/:id", authenticate, authorize("community:manage"), asyncHandler(ctrl.remove));

// Members
router.get("/:id/members", authenticate, authorize("community:read"), asyncHandler(ctrl.listMembers));
router.post("/:id/members", authenticate, authorize("community:manage"), validate(addMemberSchema), asyncHandler(ctrl.addMember));
router.delete("/:id/members/:userId", authenticate, authorize("community:manage"), asyncHandler(ctrl.removeMember));

// Posts
router.get("/:id/posts", authenticate, authorize("community:read"), asyncHandler(ctrl.listPosts));
router.post("/:id/posts", authenticate, authorize("community:write"), validate(createCommunityPostSchema), asyncHandler(ctrl.createPost));
router.get("/:id/posts/:postId", authenticate, authorize("community:read"), asyncHandler(ctrl.getPost));
router.delete("/:id/posts/:postId", authenticate, authorize("community:write"), asyncHandler(ctrl.deletePost));

// Comments
router.post("/:id/posts/:postId/comments", authenticate, authorize("community:write"), validate(createCommunityCommentSchema), asyncHandler(ctrl.addComment));
router.patch("/comments/:commentId", authenticate, authorize("community:write"), validate(editCommentSchema), asyncHandler(ctrl.editComment));
router.delete("/comments/:commentId", authenticate, authorize("community:write"), asyncHandler(ctrl.deleteComment));

// Reactions (emoji)
router.post("/:id/posts/:postId/react", authenticate, authorize("community:write"), validate(reactSchema), asyncHandler(ctrl.reactPost));
router.post("/comments/:commentId/react", authenticate, authorize("community:write"), validate(reactSchema), asyncHandler(ctrl.reactComment));

// Polls — creation restricted to Admin/Mentor/Cohort Manager (enforced in poll.service.ts), voting open to any member
router.get("/:id/polls", authenticate, authorize("community:read"), asyncHandler(pollCtrl.list));
router.post("/:id/polls", authenticate, authorize("community:write"), validate(createPollSchema), asyncHandler(pollCtrl.create));
router.post("/polls/:pollId/vote", authenticate, authorize("community:write"), validate(voteSchema), asyncHandler(pollCtrl.vote));
router.delete("/polls/:pollId", authenticate, authorize("community:write"), asyncHandler(pollCtrl.remove));

// Events — same creator restriction as Polls
router.get("/:id/events", authenticate, authorize("community:read"), asyncHandler(eventCtrl.list));
router.post("/:id/events", authenticate, authorize("community:write"), validate(createCommunityEventSchema), asyncHandler(eventCtrl.create));
router.delete("/events/:eventId", authenticate, authorize("community:write"), asyncHandler(eventCtrl.remove));

export default router;
