import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate } from "../middleware/authenticate";
import { validate } from "../middleware/validate";
import {
  sendMessageSchema,
  startConversationSchema,
  setPinnedSchema,
  setMessageReactionSchema,
} from "../validators/chat.validators";
import * as chatController from "../controllers/chat.controller";

const router = Router();

router.get("/contacts", authenticate, asyncHandler(chatController.listContacts));
router.post("/start", authenticate, validate(startConversationSchema), asyncHandler(chatController.startConversation));
router.get("/conversations", authenticate, asyncHandler(chatController.listConversations));
router.get("/:conversationId/messages", authenticate, asyncHandler(chatController.listMessages));
router.post(
  "/:conversationId/messages",
  authenticate,
  validate(sendMessageSchema),
  asyncHandler(chatController.sendMessage)
);
router.post("/:conversationId/read", authenticate, asyncHandler(chatController.markRead));
router.patch(
  "/:conversationId/pin",
  authenticate,
  validate(setPinnedSchema),
  asyncHandler(chatController.setPinned)
);
router.post(
  "/messages/:messageId/reactions",
  authenticate,
  validate(setMessageReactionSchema),
  asyncHandler(chatController.setMessageReaction)
);

export default router;
