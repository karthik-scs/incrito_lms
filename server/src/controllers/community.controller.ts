import type { Request, Response } from "express";
import { success } from "../utils/apiResponse";
import * as svc from "../services/community.service";

function isAdmin(req: Request) {
  return req.user?.roleName === "Admin";
}

export async function list(req: Request, res: Response) {
  const communities = await svc.listCommunities(req.user!.id, isAdmin(req));
  return success(res, communities);
}

export async function get(req: Request, res: Response) {
  const community = await svc.getCommunity(String(req.params.id), req.user!.id, isAdmin(req));
  return success(res, community);
}

export async function create(req: Request, res: Response) {
  const community = await svc.createCommunity(req.body, req.user!.id);
  return success(res, community, 201);
}

export async function update(req: Request, res: Response) {
  const community = await svc.updateCommunity(String(req.params.id), req.body);
  return success(res, community);
}

export async function remove(req: Request, res: Response) {
  await svc.deleteCommunity(String(req.params.id));
  return success(res, { deleted: true });
}

export async function listMembers(req: Request, res: Response) {
  const members = await svc.listMembers(String(req.params.id));
  return success(res, members);
}

export async function addMember(req: Request, res: Response) {
  const member = await svc.addMember(String(req.params.id), req.body.userId);
  return success(res, member, 201);
}

export async function removeMember(req: Request, res: Response) {
  await svc.removeMember(String(req.params.id), String(req.params.userId));
  return success(res, { deleted: true });
}

export async function listPosts(req: Request, res: Response) {
  const posts = await svc.listPosts(String(req.params.id), req.user!.id, isAdmin(req));
  return success(res, posts);
}

export async function createPost(req: Request, res: Response) {
  const post = await svc.createPost(String(req.params.id), req.user!.id, req.body);
  return success(res, post, 201);
}

export async function getPost(req: Request, res: Response) {
  const post = await svc.getPost(String(req.params.postId), req.user!.id, isAdmin(req));
  return success(res, post);
}

export async function deletePost(req: Request, res: Response) {
  await svc.deletePost(String(req.params.postId), req.user!.id, isAdmin(req));
  return success(res, { deleted: true });
}

export async function addComment(req: Request, res: Response) {
  const comment = await svc.addComment(String(req.params.postId), req.user!.id, req.body);
  return success(res, comment, 201);
}

export async function editComment(req: Request, res: Response) {
  const comment = await svc.editComment(String(req.params.commentId), req.user!.id, req.body.content);
  return success(res, comment);
}

export async function deleteComment(req: Request, res: Response) {
  await svc.deleteComment(String(req.params.commentId), req.user!.id, isAdmin(req));
  return success(res, { deleted: true });
}

export async function reactPost(req: Request, res: Response) {
  const result = await svc.setReaction(String(req.params.postId), null, req.user!.id, req.body.emoji);
  return success(res, result);
}

export async function reactComment(req: Request, res: Response) {
  const result = await svc.setReaction(null, String(req.params.commentId), req.user!.id, req.body.emoji);
  return success(res, result);
}
