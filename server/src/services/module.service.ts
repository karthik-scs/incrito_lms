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

export function listModules(cohortId: string) {
  return prisma.module.findMany({
    where: { cohortId },
    include: moduleInclude,
    orderBy: { order: "asc" },
  });
}

/** Mentors and Cohort Managers can only edit modules in cohorts they are assigned to. */
async function assertCohortAccess(cohortId: string, callerUserId: string, callerRoleName: string) {
  if (callerRoleName === "Admin") return;

  if (callerRoleName === "Mentor") {
    const assignment = await prisma.cohortMentor.findUnique({
      where: { cohortId_userId: { cohortId, userId: callerUserId } },
    });
    if (!assignment) throw new AppError("You are not assigned to this cohort", 403);
    return;
  }

  if (callerRoleName === "Cohort Manager") {
    const assignment = await prisma.cohortManagerAssignment.findUnique({
      where: { cohortId_userId: { cohortId, userId: callerUserId } },
    });
    if (!assignment) throw new AppError("You are not assigned to this cohort", 403);
    return;
  }

  throw new AppError("You do not have permission to manage curriculum", 403);
}

export async function createModule(data: {
  cohortId: string;
  title: string;
  order?: number;
  planAccess?: "ICAP" | "INTENSIVE_PRO" | "BOTH";
  callerUserId: string;
  callerRoleName: string;
}) {
  const cohort = await prisma.cohort.findUnique({ where: { id: data.cohortId } });
  if (!cohort) {
    throw new AppError("Cohort not found", 404);
  }

  await assertCohortAccess(data.cohortId, data.callerUserId, data.callerRoleName);

  const order = data.order ?? (await nextOrder(data.cohortId));

  return prisma.module.create({
    data: { cohortId: data.cohortId, title: data.title, order, planAccess: data.planAccess ?? "BOTH" },
    include: moduleInclude,
  });
}

async function nextOrder(cohortId: string) {
  const last = await prisma.module.findFirst({ where: { cohortId }, orderBy: { order: "desc" } });
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
export async function reorderModules(cohortId: string, orderedIds: string[]) {
  const modules = await prisma.module.findMany({ where: { cohortId } });
  if (orderedIds.length !== modules.length || !modules.every((m) => orderedIds.includes(m.id))) {
    throw new AppError("orderedIds must include exactly the modules currently in this cohort", 422);
  }

  await prisma.$transaction([
    ...orderedIds.map((id, index) => prisma.module.update({ where: { id }, data: { order: -(index + 1) } })),
    ...orderedIds.map((id, index) => prisma.module.update({ where: { id }, data: { order: index + 1 } })),
  ]);

  return listModules(cohortId);
}
