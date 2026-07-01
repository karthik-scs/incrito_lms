import { z } from "zod";

export const setAvailabilitySchema = z.object({
  slots: z.array(
    z.object({
      dayOfWeek: z.number().int().min(0).max(6),
      startTime: z.string().regex(/^\d{2}:\d{2}$/, "startTime must be HH:mm"),
      endTime:   z.string().regex(/^\d{2}:\d{2}$/, "endTime must be HH:mm"),
    })
  ),
});

export const createBookingSchema = z.object({
  mentorId:       z.string().min(1),
  cohortId:       z.string().optional(),
  scheduledAt:    z.coerce.date(),
  durationMinutes: z.number().int().min(15).max(120).optional(),
  topic:          z.string().max(200).optional(),
  notes:          z.string().max(1000).optional(),
});

export const confirmBookingSchema = z.object({
  meetingUrl: z.string().url().optional(),
});

export const cancelBookingSchema = z.object({
  cancelReason: z.string().max(500).optional(),
});
