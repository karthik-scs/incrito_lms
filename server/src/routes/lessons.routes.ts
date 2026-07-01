import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
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
  authorize("course:write"),
  validate(createLessonSchema),
  asyncHandler(lessonController.create)
);
router.patch(
  "/reorder",
  authenticate,
  authorize("course:write"),
  validate(reorderLessonsSchema),
  asyncHandler(lessonController.reorder)
);
router.patch(
  "/:id",
  authenticate,
  authorize("course:write"),
  validate(updateLessonSchema),
  asyncHandler(lessonController.update)
);
router.delete("/:id", authenticate, authorize("course:write"), asyncHandler(lessonController.remove));
router.patch(
  "/:id/live-class",
  authenticate,
  authorize("course:write"),
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
router.post("/:id/complete", authenticate, asyncHandler(lessonController.complete));
router.get("/:id/zoom-signature", authenticate, asyncHandler(lessonController.zoomSignature));

export default router;
