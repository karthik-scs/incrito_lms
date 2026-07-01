import type { Request, Response } from "express";
import { success } from "../utils/apiResponse";
import * as chatService from "../services/chat.service";

export async function listContacts(req: Request, res: Response) {
  const contacts = await chatService.getEligibleContacts(req.user!.id);
  return success(res, contacts);
}

export async function startConversation(req: Request, res: Response) {
  const conversation = await chatService.getOrCreateConversation(req.user!.id, req.body.targetUserId);
  return success(res, conversation, 201);
}

export async function listConversations(req: Request, res: Response) {
  const conversations = await chatService.listMyConversations(req.user!.id);
  return success(res, conversations);
}

export async function listMessages(req: Request, res: Response) {
  const since = req.query.since ? new Date(String(req.query.since)) : undefined;
  const messages = await chatService.listMessages(String(req.params.conversationId), req.user!.id, since);
  return success(res, messages);
}

export async function sendMessage(req: Request, res: Response) {
  const message = await chatService.sendMessage(String(req.params.conversationId), req.user!.id, req.body);
  return success(res, message, 201);
}

export async function markRead(req: Request, res: Response) {
  await chatService.markRead(String(req.params.conversationId), req.user!.id);
  return success(res, { marked: true });
}

export async function setPinned(req: Request, res: Response) {
  const result = await chatService.setConversationPinned(String(req.params.conversationId), req.user!.id, Boolean(req.body.pinned));
  return success(res, result);
}

export async function setMessageReaction(req: Request, res: Response) {
  const result = await chatService.setMessageReaction(String(req.params.messageId), req.user!.id, req.body.emoji);
  return success(res, result);
}
