import { prisma } from "../lib/prisma";
import { AppError } from "../utils/AppError";

export async function submitRating(studentId: string, data: {
  mentorId: string;
  bookingId?: string;
  rating: number;
  comment?: string;
}) {
  if (data.rating < 1 || data.rating > 5) throw new AppError("Rating must be between 1 and 5", 400);

  if (data.bookingId) {
    const booking = await prisma.mentorBooking.findUnique({ where: { id: data.bookingId } });
    if (!booking || booking.studentId !== studentId || booking.mentorId !== data.mentorId) {
      throw new AppError("Booking not found or does not match", 404);
    }
    if (booking.status !== "COMPLETED") throw new AppError("Can only rate completed sessions", 400);

    // Upsert so re-submitting updates the existing rating
    return prisma.mentorRating.upsert({
      where: { bookingId: data.bookingId },
      create: { mentorId: data.mentorId, studentId, bookingId: data.bookingId, rating: data.rating, comment: data.comment },
      update: { rating: data.rating, comment: data.comment },
    });
  }

  // No booking — plain rating
  return prisma.mentorRating.create({
    data: { mentorId: data.mentorId, studentId, rating: data.rating, comment: data.comment },
  });
}

export async function getMentorRatingSummary(mentorId: string) {
  const ratings = await prisma.mentorRating.findMany({
    where: { mentorId },
    include: { student: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
    orderBy: { createdAt: "desc" },
  });

  const average = ratings.length
    ? Math.round((ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length) * 10) / 10
    : null;

  const distribution = [1, 2, 3, 4, 5].map((star) => ({
    star,
    count: ratings.filter((r) => r.rating === star).length,
  }));

  return { average, total: ratings.length, distribution, ratings };
}
