import { prisma } from "../lib/prisma";
import { AppError } from "../utils/AppError";
import { notifyUser } from "./notification.service";
import { emitToUsers } from "./sse.service";

function extractMentionedUserIds(content: string | undefined | null): string[] {
  if (!content) return [];
  const ids: string[] = [];
  const regex = /@\[([^:]+):[^\]]+\]/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(content)) !== null) ids.push(m[1]);
  return [...new Set(ids)];
}

const authorSelect = {
  select: { id: true, firstName: true, lastName: true, avatarUrl: true, role: { select: { name: true } } },
} as const;

const replyInclude = {
  include: {
    author: authorSelect,
    reactions: { select: { id: true, userId: true, emoji: true } },
    replies: {
      include: {
        author: authorSelect,
        reactions: { select: { id: true, userId: true, emoji: true } },
      },
      orderBy: { createdAt: "asc" as const },
    },
  },
  orderBy: { createdAt: "asc" as const },
};

async function assertMemberOrAdmin(communityId: string, userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { role: true } });
  if (user?.role.name === "Admin") return;
  const member = await prisma.communityMember.findUnique({
    where: { communityId_userId: { communityId, userId } },
  });
  if (!member) throw new AppError("You are not a member of this community", 403);
}

export async function listCommunities(userId: string, isAdmin: boolean) {
  if (isAdmin) {
    return prisma.community.findMany({
      include: {
        createdBy: authorSelect,
        _count: { select: { members: true, posts: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }
  return prisma.community.findMany({
    where: { members: { some: { userId } } },
    include: {
      createdBy: authorSelect,
      _count: { select: { members: true, posts: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getCommunity(communityId: string, userId: string, isAdmin: boolean) {
  const community = await prisma.community.findUnique({
    where: { id: communityId },
    include: {
      createdBy: authorSelect,
      _count: { select: { members: true } },
    },
  });
  if (!community) throw new AppError("Community not found", 404);
  if (!isAdmin) await assertMemberOrAdmin(communityId, userId);
  return community;
}

export async function createCommunity(
  data: { name: string; description?: string; coverUrl?: string },
  createdById: string
) {
  return prisma.community.create({
    data: { ...data, createdById },
    include: { createdBy: authorSelect, _count: { select: { members: true, posts: true } } },
  });
}

export async function updateCommunity(
  communityId: string,
  data: { name?: string; description?: string; coverUrl?: string }
) {
  const community = await prisma.community.findUnique({ where: { id: communityId } });
  if (!community) throw new AppError("Community not found", 404);
  return prisma.community.update({
    where: { id: communityId },
    data,
    include: { createdBy: authorSelect, _count: { select: { members: true, posts: true } } },
  });
}

export async function deleteCommunity(communityId: string) {
  const community = await prisma.community.findUnique({ where: { id: communityId } });
  if (!community) throw new AppError("Community not found", 404);
  await prisma.community.delete({ where: { id: communityId } });
}

export async function listMembers(communityId: string) {
  const community = await prisma.community.findUnique({ where: { id: communityId } });
  if (!community) throw new AppError("Community not found", 404);
  return prisma.communityMember.findMany({
    where: { communityId },
    include: { user: authorSelect },
    orderBy: { addedAt: "asc" },
  });
}

export async function addMember(communityId: string, userId: string) {
  const community = await prisma.community.findUnique({ where: { id: communityId } });
  if (!community) throw new AppError("Community not found", 404);
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { role: true } });
  if (!user) throw new AppError("User not found", 404);

  if (user.role.name === "Student") {
    const hasIntensivePro = await prisma.enrollment.findFirst({ where: { userId, plan: "INTENSIVE_PRO" } });
    if (!hasIntensivePro) {
      throw new AppError("This is a Premium Community — only Intensive Pro plan students can be added", 403);
    }
  }

  return prisma.communityMember.upsert({
    where: { communityId_userId: { communityId, userId } },
    update: {},
    create: { communityId, userId },
    include: { user: authorSelect },
  });
}

export async function removeMember(communityId: string, userId: string) {
  await prisma.communityMember.delete({
    where: { communityId_userId: { communityId, userId } },
  });
}

export async function listPosts(communityId: string, userId: string, isAdmin: boolean) {
  if (!isAdmin) await assertMemberOrAdmin(communityId, userId);
  return prisma.post.findMany({
    where: { communityId },
    include: {
      author: authorSelect,
      reactions: { select: { id: true, userId: true, emoji: true } },
      _count: { select: { comments: true } },
    },
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
  });
}

export async function createPost(
  communityId: string,
  authorId: string,
  data: { title: string; content: string; attachmentUrl?: string; attachmentType?: string }
) {
  await assertMemberOrAdmin(communityId, authorId);
  return prisma.post.create({
    data: { communityId, authorId, isCommunityPost: true, communityTier: "PREMIUM", ...data },
    include: {
      author: authorSelect,
      reactions: { select: { id: true, userId: true, emoji: true } },
      _count: { select: { comments: true } },
    },
  });
}

export async function deletePost(postId: string, userId: string, isAdmin: boolean) {
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) throw new AppError("Post not found", 404);
  if (post.authorId !== userId && !isAdmin) throw new AppError("You can only delete your own posts", 403);
  await prisma.post.delete({ where: { id: postId } });
}

export async function getPost(postId: string, userId: string, isAdmin: boolean) {
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) throw new AppError("Post not found", 404);
  if (post.communityId && !isAdmin) await assertMemberOrAdmin(post.communityId, userId);
  return prisma.post.findUnique({
    where: { id: postId },
    include: {
      author: authorSelect,
      reactions: { select: { id: true, userId: true, emoji: true } },
      comments: {
        where: { parentCommentId: null },
        ...replyInclude,
      },
    },
  });
}

export async function addComment(
  postId: string,
  authorId: string,
  data: { content?: string; parentCommentId?: string; attachmentUrl?: string; attachmentType?: string }
) {
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) throw new AppError("Post not found", 404);
  if (post.communityId) await assertMemberOrAdmin(post.communityId, authorId);

  const { content, parentCommentId, attachmentUrl, attachmentType } = data;
  if (parentCommentId) {
    const parent = await prisma.comment.findUnique({ where: { id: parentCommentId } });
    if (!parent || parent.postId !== postId) throw new AppError("Parent comment not found", 404);
  }

  const comment = await prisma.comment.create({
    data: { postId, content, authorId, parentCommentId, attachmentUrl, attachmentType },
    include: { author: authorSelect, reactions: { select: { id: true, userId: true, emoji: true } } },
  });

  // Notify the reply target (parent comment author or post author).
  const targetId = parentCommentId
    ? (await prisma.comment.findUnique({ where: { id: parentCommentId } }))?.authorId
    : post.authorId;
  if (targetId && targetId !== authorId) {
    await notifyUser(
      targetId,
      "ANNOUNCEMENT",
      "New reply in community",
      `${comment.author.firstName} replied to your post.`,
      { postId }
    ).catch(() => null);
  }

  // Notify each @mentioned user (skip author and the already-notified reply target).
  const mentionedIds = extractMentionedUserIds(content).filter(
    (id) => id !== authorId && id !== targetId
  );
  for (const mentionedId of mentionedIds) {
    await notifyUser(
      mentionedId,
      "ANNOUNCEMENT",
      "You were mentioned",
      `${comment.author.firstName} mentioned you in a community post.`,
      { postId }
    ).catch(() => null);
  }

  // Push a live-update event to all community members so their feed refreshes.
  if (post.communityId) {
    const communityMembers = await prisma.communityMember.findMany({
      where: { communityId: post.communityId },
      select: { userId: true },
    });
    emitToUsers(communityMembers.map((m) => m.userId), "discussion_update", { postId, communityId: post.communityId });
  }

  return comment;
}

export async function editComment(commentId: string, userId: string, content: string) {
  const comment = await prisma.comment.findUnique({ where: { id: commentId } });
  if (!comment) throw new AppError("Comment not found", 404);
  if (comment.authorId !== userId) throw new AppError("You can only edit your own comments", 403);
  return prisma.comment.update({
    where: { id: commentId },
    data: { content, editedAt: new Date() },
    include: { author: authorSelect, reactions: { select: { id: true, userId: true, emoji: true } } },
  });
}

export async function deleteComment(commentId: string, userId: string, isAdmin: boolean) {
  const comment = await prisma.comment.findUnique({ where: { id: commentId } });
  if (!comment) throw new AppError("Comment not found", 404);
  if (comment.authorId !== userId && !isAdmin) throw new AppError("You can only delete your own comments", 403);
  await prisma.comment.delete({ where: { id: commentId } });
}

export async function setReaction(postId: string | null, commentId: string | null, userId: string, emoji: string) {
  const existing = await prisma.reaction.findFirst({ where: { postId: postId ?? undefined, commentId: commentId ?? undefined, userId } });
  if (existing) {
    if (existing.emoji === emoji) {
      await prisma.reaction.delete({ where: { id: existing.id } });
      return { reacted: false, emoji: null };
    }
    const updated = await prisma.reaction.update({ where: { id: existing.id }, data: { emoji } });
    return { reacted: true, emoji: updated.emoji };
  }
  const reaction = await prisma.reaction.create({
    data: { userId, postId: postId ?? undefined, commentId: commentId ?? undefined, emoji },
  });
  return { reacted: true, emoji: reaction.emoji };
}
