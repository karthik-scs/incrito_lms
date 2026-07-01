import { prisma } from "../lib/prisma";
import { AppError } from "../utils/AppError";

const moduleInclude = {
  lessons: {
    orderBy: { order: "asc" as const },
    include: {
      liveClass: true,
      resources: true,
    },
  },
} as const;

export function listModules(courseId: string) {
  return prisma.module.findMany({
    where: { courseId },
    include: moduleInclude,
    orderBy: { order: "asc" },
  });
}

export async function createModule(data: {
  courseId: string;
  title: string;
  order?: number;
  planAccess?: "ICAP" | "INTENSIVE_PRO" | "BOTH";
}) {
  const course = await prisma.course.findUnique({ where: { id: data.courseId } });
  if (!course) {
    throw new AppError("Course not found", 404);
  }

  const order = data.order ?? (await nextOrder(data.courseId));

  return prisma.module.create({
    data: { courseId: data.courseId, title: data.title, order, planAccess: data.planAccess ?? "BOTH" },
    include: moduleInclude,
  });
}

async function nextOrder(courseId: string) {
  const last = await prisma.module.findFirst({ where: { courseId }, orderBy: { order: "desc" } });
  return (last?.order ?? 0) + 1;
}

async function getModule(id: string) {
  const module = await prisma.module.findUnique({ where: { id } });
  if (!module) {
    throw new AppError("Module not found", 404);
  }
  return module;
}

export async function updateModule(
  id: string,
  data: { title?: string; order?: number; planAccess?: "ICAP" | "INTENSIVE_PRO" | "BOTH" }
) {
  await getModule(id);
  return prisma.module.update({ where: { id }, data, include: moduleInclude });
}

export async function deleteModule(id: string) {
  await getModule(id);
  await prisma.module.delete({ where: { id } });
}

/**
 * `@@unique([courseId, order])` means swapping two modules' positions in one pass can collide
 * (e.g. 1<->2 briefly both wanting order 2). Bump everything to negative offsets first, then
 * assign final order values in a second pass, all inside one transaction.
 */
export async function reorderModules(courseId: string, orderedIds: string[]) {
  const modules = await prisma.module.findMany({ where: { courseId } });
  if (orderedIds.length !== modules.length || !modules.every((m) => orderedIds.includes(m.id))) {
    throw new AppError("orderedIds must include exactly the modules currently in this course", 422);
  }

  await prisma.$transaction([
    ...orderedIds.map((id, index) => prisma.module.update({ where: { id }, data: { order: -(index + 1) } })),
    ...orderedIds.map((id, index) => prisma.module.update({ where: { id }, data: { order: index + 1 } })),
  ]);

  return listModules(courseId);
}
