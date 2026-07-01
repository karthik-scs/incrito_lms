import type { Request, Response } from "express";
import { success } from "../utils/apiResponse";
import * as bookingService from "../services/booking.service";

export async function getAvailability(req: Request, res: Response) {
  const mentorId = String(req.params.mentorId ?? req.user!.id);
  return success(res, await bookingService.listAvailability(mentorId));
}

export async function setAvailability(req: Request, res: Response) {
  return success(res, await bookingService.setAvailability(req.user!.id, req.body.slots));
}

export async function myBookings(req: Request, res: Response) {
  const { roleName } = req.user!;
  const isMentor = roleName === "Mentor" || roleName === "Admin" || roleName === "Cohort Manager";
  const data = isMentor
    ? await bookingService.listBookingsForMentor(req.user!.id)
    : await bookingService.listBookingsForStudent(req.user!.id);
  return success(res, data);
}

export async function createBooking(req: Request, res: Response) {
  return success(res, await bookingService.createBooking(req.user!.id, {
    ...req.body,
    scheduledAt: new Date(req.body.scheduledAt),
  }), 201);
}

export async function confirmBooking(req: Request, res: Response) {
  return success(res, await bookingService.confirmBooking(String(req.params.id), req.user!.id, req.body.meetingUrl));
}

export async function cancelBooking(req: Request, res: Response) {
  return success(res, await bookingService.cancelBooking(String(req.params.id), req.user!.id, req.body.cancelReason));
}

export async function completeBooking(req: Request, res: Response) {
  return success(res, await bookingService.completeBooking(String(req.params.id), req.user!.id));
}
