import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate } from "../middleware/authenticate";
import { validate } from "../middleware/validate";
import {
  setAvailabilitySchema,
  createBookingSchema,
  confirmBookingSchema,
  cancelBookingSchema,
} from "../validators/booking.validators";
import * as bookingController from "../controllers/booking.controller";

const router = Router();
router.use(authenticate);

// Availability — mentor manages their own; anyone can read a specific mentor's
router.get("/availability",                   asyncHandler(bookingController.getAvailability));
router.get("/availability/:mentorId",         asyncHandler(bookingController.getAvailability));
router.put("/availability", validate(setAvailabilitySchema), asyncHandler(bookingController.setAvailability));

// Bookings
router.get("/",                               asyncHandler(bookingController.myBookings));
router.post("/", validate(createBookingSchema), asyncHandler(bookingController.createBooking));
router.patch("/:id/confirm", validate(confirmBookingSchema), asyncHandler(bookingController.confirmBooking));
router.patch("/:id/cancel",  validate(cancelBookingSchema),  asyncHandler(bookingController.cancelBooking));
router.patch("/:id/complete",                 asyncHandler(bookingController.completeBooking));

export default router;
