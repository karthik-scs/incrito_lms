import type { Request, Response } from "express";
import { success } from "../utils/apiResponse";
import * as discussionService from "../services/discussion.service";

export async function list(req: Request, res: Response) {
  const cohortId = String(req.query.cohortId ?? "");
  const sort = req.query.sort === "popular" ? "popular" : "recent";
  const posts = await discussionService.listPosts(cohortId, req.user!.id, sort);
  return success(res, posts);
}

export async function create(req: Request, res: Response) {
  const post = await discussionService.createPost(req.body, req.user!.id);
  return success(res, post, 201);
}

export async function get(req: Request, res: Response) {
  const post = await discussionService.getPost(String(req.params.id), req.user!.id);
  return success(res, post);
}

export async function remove(req: Request, res: Response) {
  const isAdmin = req.user!.roleName === "Admin";
  await discussionService.deletePost(String(req.params.id), req.user!.id, isAdmin);
  return success(res, { deleted: true });
}

export async function addComment(req: Request, res: Response) {
  const comment = await discussionService.addComment(String(req.params.id), req.user!.id, req.body);
  return success(res, comment, 201);
}

export async function editComment(req: Request, res: Response) {
  const comment = await discussionService.editComment(String(req.params.commentId), req.user!.id, req.body.content);
  return success(res, comment);
}

export async function deleteComment(req: Request, res: Response) {
  const isAdmin = req.user!.roleName === "Admin";
  await discussionService.deleteComment(String(req.params.commentId), req.user!.id, isAdmin);
  return success(res, { deleted: true });
}

export async function setReaction(req: Request, res: Response) {
  const result = await discussionService.setReaction(String(req.params.id), req.user!.id, req.body.emoji ?? "👍");
  return success(res, result);
}

export async function setCommentReaction(req: Request, res: Response) {
  const result = await discussionService.setCommentReaction(String(req.params.commentId), req.user!.id, req.body.emoji ?? "👍");
  return success(res, result);
}
