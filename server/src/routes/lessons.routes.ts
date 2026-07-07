import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate } from "../middleware/authenticate";
import { validate } from "../middleware/validate";
import {
  createLessonSchema,
  updateLessonSchema,
  updateLiveClassSchema,
  reorderLessonsSchema,
  presignRecordingSchema,
  finalizeRecordingSchema,
} from "../validators/lesson.validators";
import * as lessonController from "../controllers/lesson.controller";

const router = Router();

router.get("/", asyncHandler(lessonController.list));
router.get("/:id", asyncHandler(lessonController.get));
router.post(
  "/",
  authenticate,
  validate(createLessonSchema),
  asyncHandler(lessonController.create)
);
router.patch(
  "/reorder",
  authenticate,
  validate(reorderLessonsSchema),
  asyncHandler(lessonController.reorder)
);
router.patch(
  "/:id",
  authenticate,
  validate(updateLessonSchema),
  asyncHandler(lessonController.update)
);
router.delete("/:id", authenticate, asyncHandler(lessonController.remove));
router.patch(
  "/:id/live-class",
  authenticate,
  validate(updateLiveClassSchema),
  asyncHandler(lessonController.updateLiveClass)
);
// Gated by ownership inside the service (host of this specific session, or Admin) — not
// `course:write`, since a Cohort Manager host doesn't hold that permission but should still be
// able to upload their own session's recording.
router.post(
  "/:id/live-class/recording/presign",
  authenticate,
  validate(presignRecordingSchema),
  asyncHandler(lessonController.presignRecording)
);
router.post(
  "/:id/live-class/recording/finalize",
  authenticate,
  validate(finalizeRecordingSchema),
  asyncHandler(lessonController.finalizeRecording)
);
router.get("/:id/live-class/recording-url", authenticate, asyncHandler(lessonController.recordingUrl));
router.get("/:id/content-url", authenticate, asyncHandler(lessonController.contentUrl));
// Token-authenticated routes — no session middleware needed; the IP-bound stream token carries identity.
router.get("/:id/stream", asyncHandler(lessonController.streamContent));
router.get("/:id/hls-manifest", asyncHandler(lessonController.hlsManifest));
router.get("/:id/hls-key", asyncHandler(lessonController.hlsKey));
router.post("/:id/complete", authenticate, asyncHandler(lessonController.complete));

export default router;
