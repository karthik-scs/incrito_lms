import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { redirectToFile } from "../controllers/files.controller";

const router = Router();

// No auth required — keys are unguessable (UUID-based) and this route only serves
// non-sensitive assets (avatars, thumbnails, attachments, voice notes, community covers).
// Sensitive content (recordings, lesson content, resources) goes through its own
// dedicated authenticated signed-URL endpoint, not here.
router.get("/*key", asyncHandler(redirectToFile));

export default router;
