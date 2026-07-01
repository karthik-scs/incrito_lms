import { prisma } from "../lib/prisma";

export async function globalSearch(query: string, userId: string, roleName: string) {
  const q = query.trim();
  if (q.length < 2) {
    return { courses: [], users: [], communities: [] };
  }

  const courses = await prisma.course.findMany({
    where: { title: { contains: q, mode: "insensitive" } },
    select: { id: true, title: true, slug: true, status: true },
    take: 5,
  });

  const users =
    roleName === "Admin"
      ? await prisma.user.findMany({
          where: {
            OR: [
              { firstName: { contains: q, mode: "insensitive" } },
              { lastName: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
            ],
          },
          select: { id: true, firstName: true, lastName: true, email: true, role: { select: { name: true } } },
          take: 5,
        })
      : [];

  const communities = await prisma.community.findMany({
    where: {
      name: { contains: q, mode: "insensitive" },
      ...(roleName === "Admin" ? {} : { members: { some: { userId } } }),
    },
    select: { id: true, name: true },
    take: 5,
  });

  return { courses, users, communities };
}
