import { z } from "zod";

export const submitRatingSchema = z.object({
  mentorId:  z.string().min(1),
  bookingId: z.string().optional(),
  rating:    z.number().int().min(1).max(5),
  comment:   z.string().max(1000).optional(),
});
