import multer from "multer";
import { AppError } from "../utils/AppError";

/**
 * Every upload goes to S3 (see `s3.ts`), never local disk — `multer.memoryStorage()` holds the
 * file in memory just long enough for the controller to push it to S3 and store the resulting
 * key. Folder names below are purely S3 key prefixes now (`buildS3Key(folder, ...)`), not local
 * directories.
 */
export const AVATARS_FOLDER = "avatars";
export const RECORDINGS_FOLDER = "recordings";
export const COURSE_THUMBNAILS_FOLDER = "course-thumbnails";
export const LESSON_THUMBNAILS_FOLDER = "lesson-thumbnails";
export const RESOURCES_FOLDER = "resources";
export const SUBMISSIONS_FOLDER = "submissions";
export const CERTIFICATE_DESIGNS_FOLDER = "certificate-designs";
export const DISCUSSION_ATTACHMENTS_FOLDER = "discussion-attachments";
export const CHAT_ATTACHMENTS_FOLDER = "chat-attachments";
export const VOICE_NOTES_FOLDER = "voice-notes";
export const COMMUNITY_COVERS_FOLDER = "community-covers";

const IMAGE_MIME_EXTENSIONS: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
};

/** Anything a `Resource`/`Submission` upload might be — kept in sync with the resource type enum. */
const DOCUMENT_MIME_EXTENSIONS: Record<string, string> = {
  ...IMAGE_MIME_EXTENSIONS,
  "application/pdf": ".pdf",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "application/vnd.ms-excel": ".xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "video/quicktime": ".mov",
};

/** Maps an uploaded file's mimetype to this app's `Resource.fileType` enum (PDF/DOCX/EXCEL/VIDEO/IMAGE). */
export function inferResourceType(mimetype: string): "PDF" | "DOCX" | "EXCEL" | "VIDEO" | "IMAGE" | null {
  if (mimetype.startsWith("image/")) return "IMAGE";
  if (mimetype.startsWith("video/")) return "VIDEO";
  if (mimetype === "application/pdf") return "PDF";
  if (mimetype.includes("word")) return "DOCX";
  if (mimetype.includes("excel") || mimetype.includes("spreadsheet")) return "EXCEL";
  return null;
}

/** Same idea, generalized for any attachment field (discussion comments, chat messages). */
export function inferAttachmentType(mimetype: string): "IMAGE" | "VIDEO" | "AUDIO" | "PDF" | "DOCX" | "EXCEL" | "FILE" {
  if (mimetype.startsWith("audio/")) return "AUDIO";
  return inferResourceType(mimetype) ?? "FILE";
}

const AUDIO_MIME_EXTENSIONS: Record<string, string> = {
  "audio/webm": ".webm",
  "audio/ogg": ".ogg",
  "audio/mpeg": ".mp3",
  "audio/mp4": ".m4a",
  "audio/wav": ".wav",
};

/** Maps a mimetype to its file extension for any of the maps above — used to build the S3 key. */
export function extensionFor(mimetype: string): string {
  return (
    IMAGE_MIME_EXTENSIONS[mimetype] ??
    DOCUMENT_MIME_EXTENSIONS[mimetype] ??
    AUDIO_MIME_EXTENSIONS[mimetype] ??
    ""
  );
}

function makeUpload(options: { allowedMimeTypes: Record<string, string>; maxSizeMB: number; notAllowedMessage: string }) {
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: options.maxSizeMB * 1024 * 1024 },
    fileFilter: (_req, file, callback) => {
      if (!options.allowedMimeTypes[file.mimetype]) {
        callback(new AppError(options.notAllowedMessage, 422));
        return;
      }
      callback(null, true);
    },
  });
}

export const avatarUpload = makeUpload({
  allowedMimeTypes: IMAGE_MIME_EXTENSIONS,
  maxSizeMB: 5,
  notAllowedMessage: "Avatar must be a PNG, JPEG, or WEBP image",
});

export const courseThumbnailUpload = makeUpload({
  allowedMimeTypes: IMAGE_MIME_EXTENSIONS,
  maxSizeMB: 5,
  notAllowedMessage: "Thumbnail must be a PNG, JPEG, or WEBP image",
});

export const lessonThumbnailUpload = makeUpload({
  allowedMimeTypes: IMAGE_MIME_EXTENSIONS,
  maxSizeMB: 5,
  notAllowedMessage: "Thumbnail must be a PNG, JPEG, or WEBP image",
});

export const resourceUpload = makeUpload({
  allowedMimeTypes: DOCUMENT_MIME_EXTENSIONS,
  maxSizeMB: 50,
  notAllowedMessage: "Resources must be a PDF, Word, Excel, video, or image file",
});

export const submissionUpload = makeUpload({
  allowedMimeTypes: DOCUMENT_MIME_EXTENSIONS,
  maxSizeMB: 20,
  notAllowedMessage: "Submissions must be a PDF, Word, Excel, video, or image file",
});

export const certificateDesignUpload = makeUpload({
  allowedMimeTypes: { ...IMAGE_MIME_EXTENSIONS, "application/pdf": ".pdf" },
  maxSizeMB: 10,
  notAllowedMessage: "Certificate design must be a PNG, JPEG, WEBP, or PDF file",
});

export const discussionAttachmentUpload = makeUpload({
  allowedMimeTypes: DOCUMENT_MIME_EXTENSIONS,
  maxSizeMB: 25,
  notAllowedMessage: "Attachments must be a PDF, Word, Excel, video, or image file",
});

export const chatAttachmentUpload = makeUpload({
  allowedMimeTypes: DOCUMENT_MIME_EXTENSIONS,
  maxSizeMB: 25,
  notAllowedMessage: "Attachments must be a PDF, Word, Excel, video, or image file",
});

export const voiceNoteUpload = makeUpload({
  allowedMimeTypes: AUDIO_MIME_EXTENSIONS,
  maxSizeMB: 10,
  notAllowedMessage: "Voice notes must be a recorded audio file",
});

export const communityCoverUpload = makeUpload({
  allowedMimeTypes: IMAGE_MIME_EXTENSIONS,
  maxSizeMB: 5,
  notAllowedMessage: "Cover image must be a PNG, JPEG, or WEBP image",
});
