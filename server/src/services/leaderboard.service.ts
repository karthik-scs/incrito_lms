import { prisma } from "../lib/prisma";

export async function getLeaderboard(cohortId: string) {
  const entries = await prisma.leaderboardEntry.findMany({
    where: { cohortId },
    include: { user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
    orderBy: { points: "desc" },
  });

  return entries.map((entry, index) => ({ ...entry, rank: index + 1 }));
}
