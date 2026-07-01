import type { Request, Response } from "express";
import { success } from "../utils/apiResponse";
import * as eventService from "../services/community-event.service";

export async function list(req: Request, res: Response) {
  const events = await eventService.listEvents(String(req.params.id), req.user!.id);
  return success(res, events);
}

export async function create(req: Request, res: Response) {
  const event = await eventService.createEvent(String(req.params.id), req.user!.id, req.body);
  return success(res, event, 201);
}

export async function remove(req: Request, res: Response) {
  const isAdmin = req.user!.roleName === "Admin";
  await eventService.deleteEvent(String(req.params.eventId), req.user!.id, isAdmin);
  return success(res, { deleted: true });
}
