import type { Request, Response } from "express";
import { success } from "../utils/apiResponse";
import * as calendarService from "../services/calendar.service";

export async function list(req: Request, res: Response) {
  const { from, to, cohortId, courseId, mentorId } = req.query;
  const events = await calendarService.getMyCalendarEvents(req.user!.id, {
    from: from ? new Date(String(from)) : undefined,
    to: to ? new Date(String(to)) : undefined,
    cohortId: cohortId ? String(cohortId) : undefined,
    courseId: courseId ? String(courseId) : undefined,
    mentorId: mentorId ? String(mentorId) : undefined,
  });
  return success(res, events);
}
