import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import {
  courseThumbnailUpload,
  lessonThumbnailUpload,
  resourceUpload,
  submissionUpload,
  certificateDesignUpload,
  discussionAttachmentUpload,
  chatAttachmentUpload,
  voiceNoteUpload,
  communityCoverUpload,
} from "../lib/uploads";
import * as uploadController from "../controllers/upload.controller";

const router = Router();

router.post(
  "/course-thumbnail",
  authenticate,
  authorize("course:write"),
  courseThumbnailUpload.single("file"),
  asyncHandler(uploadController.courseThumbnail)
);
router.post(
  "/lesson-thumbnail",
  authenticate,
  authorize("course:write"),
  lessonThumbnailUpload.single("file"),
  asyncHandler(uploadController.lessonThumbnail)
);
router.post(
  "/resource",
  authenticate,
  authorize("course:write"),
  resourceUpload.single("file"),
  asyncHandler(uploadController.resource)
);
// Any authenticated student can upload their own assignment submission file — no course:write gate.
router.post("/submission", authenticate, submissionUpload.single("file"), asyncHandler(uploadController.submission));
router.post(
  "/certificate-design",
  authenticate,
  authorize("certificate:write"),
  certificateDesignUpload.single("file"),
  asyncHandler(uploadController.certificateDesign)
);
// Any authenticated cohort member can attach a file to a comment/chat message — access to the
// specific post/conversation itself is enforced by discussion/chat service calls, not here.
router.post(
  "/discussion-attachment",
  authenticate,
  discussionAttachmentUpload.single("file"),
  asyncHandler(uploadController.discussionAttachment)
);
router.post("/chat-attachment", authenticate, chatAttachmentUpload.single("file"), asyncHandler(uploadController.chatAttachment));
router.post("/voice-note", authenticate, voiceNoteUpload.single("file"), asyncHandler(uploadController.voiceNote));
router.post(
  "/community-cover",
  authenticate,
  authorize("community:manage"),
  communityCoverUpload.single("file"),
  asyncHandler(uploadController.communityCover)
);

export default router;
