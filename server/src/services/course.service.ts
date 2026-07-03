import { prisma } from "../lib/prisma";
import { AppError } from "../utils/AppError";
import { deleteObject, keyFromUrl } from "../lib/s3";

const courseInclude = {
  mentor: { select: { id: true, firstName: true, lastName: true } },
  category: true,
  tags: { include: { tag: true } },
  _count: { select: { modules: true } },
} as const;

export async function listCourses(filter: {
  categoryId?: string;
  status?: string;
  requestingUserId?: string;
  requestingUserRole?: string;
}) {
  const { categoryId, status, requestingUserId, requestingUserRole } = filter;

  // Mentor and Cohort Manager see only courses they created/mentor, plus courses
  // belonging to any cohort they are assigned to.
  if (requestingUserId && (requestingUserRole === "Mentor" || requestingUserRole === "Cohort Manager")) {
    // Collect course IDs from cohorts this user belongs to.
    const cohortRows = requestingUserRole === "Mentor"
      ? await prisma.cohortMentor.findMany({ where: { userId: requestingUserId }, select: { cohort: { select: { courseId: true } } } })
      : await prisma.cohortManagerAssignment.findMany({ where: { userId: requestingUserId }, select: { cohort: { select: { courseId: true } } } });

    const cohortCourseIds = cohortRows.map((r) => r.cohort.courseId);

    return prisma.course.findMany({
      where: {
        categoryId,
        status: status as never,
        OR: [
          { mentorId: requestingUserId },
          { createdById: requestingUserId },
          { id: { in: cohortCourseIds } },
        ],
      },
      include: courseInclude,
      orderBy: { createdAt: "desc" },
    });
  }

  return prisma.course.findMany({
    where: { categoryId, status: status as never },
    include: courseInclude,
    orderBy: { createdAt: "desc" },
  });
}

export async function getCourseBySlug(slug: string) {
  const course = await prisma.course.findUnique({
    where: { slug },
    include: {
      ...courseInclude,
      modules: {
        include: {
          lessons: {
            include: {
              liveClass: { include: { mentor: { select: { id: true, firstName: true, lastName: true } } } },
              resources: true,
            },
            orderBy: { order: "asc" },
          },
        },
        orderBy: { order: "asc" },
      },
    },
  });
  if (!course) {
    throw new AppError("Course not found", 404);
  }
  return course;
}

type CourseInput = {
  title: string;
  slug: string;
  description?: string;
  thumbnailUrl?: string;
  categoryId?: string;
  tagIds?: string[];
  mentorId: string;
  isFree: boolean;
  priceInSmallestUnit?: number;
  currency: string;
  unlockMode: "SEQUENTIAL" | "FREE";
};

export async function createCourse(data: CourseInput, createdById: string) {
  const existing = await prisma.course.findUnique({ where: { slug: data.slug } });
  if (existing) {
    throw new AppError("A course with this slug already exists", 409);
  }

  const { tagIds, ...courseFields } = data;

  return prisma.course.create({
    data: {
      ...courseFields,
      createdById,
      tags: tagIds ? { create: tagIds.map((tagId) => ({ tagId })) } : undefined,
    },
    include: courseInclude,
  });
}

export async function updateCourse(id: string, data: Partial<Omit<CourseInput, "mentorId">>) {
  const course = await prisma.course.findUnique({ where: { id } });
  if (!course) {
    throw new AppError("Course not found", 404);
  }

  const { tagIds, ...courseFields } = data;

  if (tagIds) {
    await prisma.courseTag.deleteMany({ where: { courseId: id } });
  }

  if (courseFields.thumbnailUrl && courseFields.thumbnailUrl !== course.thumbnailUrl) {
    const oldKey = keyFromUrl(course.thumbnailUrl);
    if (oldKey) await deleteObject(oldKey);
  }

  return prisma.course.update({
    where: { id },
    data: {
      ...courseFields,
      tags: tagIds ? { create: tagIds.map((tagId) => ({ tagId })) } : undefined,
    },
    include: courseInclude,
  });
}

export async function setCourseStatus(id: string, status: "DRAFT" | "PUBLISHED" | "ARCHIVED") {
  const course = await prisma.course.findUnique({ where: { id } });
  if (!course) {
    throw new AppError("Course not found", 404);
  }
  return prisma.course.update({ where: { id }, data: { status }, include: courseInclude });
}
