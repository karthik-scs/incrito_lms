import { prisma } from "../lib/prisma";
import { AppError } from "../utils/AppError";

const authorSelect = {
  select: { id: true, firstName: true, lastName: true, avatarUrl: true, role: { select: { name: true } } },
} as const;

const CREATOR_ROLES = ["Admin", "Mentor", "Cohort Manager"];

async function assertMemberOrAdmin(communityId: string, userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { role: true } });
  if (user?.role.name === "Admin") return;
  const member = await prisma.communityMember.findUnique({ where: { communityId_userId: { communityId, userId } } });
  if (!member) throw new AppError("You are not a member of this community", 403);
}

export async function listPolls(communityId: string, userId: string) {
  await assertMemberOrAdmin(communityId, userId);

  const polls = await prisma.poll.findMany({
    where: { communityId },
    include: {
      createdBy: authorSelect,
      options: {
        include: {
          _count: { select: { votes: true } },
          votes: { where: { userId }, select: { id: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return polls.map((poll) => ({
    id: poll.id,
    communityId: poll.communityId,
    question: poll.question,
    createdAt: poll.createdAt,
    createdBy: poll.createdBy,
    totalVotes: poll.options.reduce((sum, o) => sum + o._count.votes, 0),
    options: poll.options.map((o) => ({ id: o.id, label: o.label, voteCount: o._count.votes, votedByMe: o.votes.length > 0 })),
  }));
}

export async function createPoll(
  communityId: string,
  userId: string,
  data: { question: string; options: string[] }
) {
  await assertMemberOrAdmin(communityId, userId);

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, include: { role: true } });
  if (!CREATOR_ROLES.includes(user.role.name)) {
    throw new AppError("Only admins, mentors, and cohort managers can create polls", 403);
  }

  const options = data.options.map((o) => o.trim()).filter(Boolean);
  if (options.length < 2) {
    throw new AppError("A poll needs at least 2 options", 422);
  }

  const poll = await prisma.poll.create({
    data: {
      communityId,
      question: data.question,
      createdById: userId,
      options: { create: options.map((label) => ({ label })) },
    },
    include: { createdBy: authorSelect, options: true },
  });

  return {
    ...poll,
    totalVotes: 0,
    options: poll.options.map((o) => ({ id: o.id, label: o.label, voteCount: 0, votedByMe: false })),
  };
}

export async function vote(pollId: string, optionId: string, userId: string) {
  const option = await prisma.pollOption.findUnique({ where: { id: optionId }, include: { poll: true } });
  if (!option || option.pollId !== pollId) {
    throw new AppError("Option not found", 404);
  }
  await assertMemberOrAdmin(option.poll.communityId, userId);

  await prisma.pollVote.upsert({
    where: { pollId_userId: { pollId, userId } },
    update: { optionId },
    create: { pollId, optionId, userId },
  });
}

export async function deletePoll(pollId: string, userId: string, isAdmin: boolean) {
  const poll = await prisma.poll.findUnique({ where: { id: pollId } });
  if (!poll) {
    throw new AppError("Poll not found", 404);
  }
  if (poll.createdById !== userId && !isAdmin) {
    throw new AppError("You can only delete your own polls", 403);
  }
  await prisma.poll.delete({ where: { id: pollId } });
}
