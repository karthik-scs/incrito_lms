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

const authorSelect = { select: { id: true, firstName: true, lastName: true, avatarUrl: true, role: { select: { name: true } } } } as const;

const replySelect = {
  include: { author: authorSelect, reactions: { select: { id: true, userId: true, emoji: true } } },
  orderBy: { createdAt: "asc" as const },
};

/** Admins can see/post anywhere; everyone else must be enrolled, mentoring, or managing this specific cohort. */
export async function assertCohortAccess(userId: string, cohortId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { role: true } });
  if (user?.role.name === "Admin") return;

  const cohort = await prisma.cohort.findUnique({ where: { id: cohortId } });
  if (!cohort) {
    throw new AppError("Cohort not found", 404);
  }

  const isManager = await prisma.cohortManagerAssignment.findUnique({ where: { cohortId_userId: { cohortId, userId } } });
  if (isManager) return;

  const isMentor = await prisma.cohortMentor.findUnique({ where: { cohortId_userId: { cohortId, userId } } });
  if (isMentor) return;

  const isEnrolled = await prisma.enrollment.findUnique({ where: { userId_cohortId: { userId, cohortId } } });
  if (isEnrolled) return;

  throw new AppError("You don't have access to this cohort's discussion", 403);
}

export async function listPosts(cohortId: string, userId: string, sort: "recent" | "popular" = "recent") {
  await assertCohortAccess(userId, cohortId);
  return prisma.post.findMany({
    where: { cohortId },
    include: {
      author: authorSelect,
      _count: { select: { comments: true, reactions: true } },
      reactions: { where: { userId }, select: { id: true } },
    },
    orderBy:
      sort === "popular" ? [{ isPinned: "desc" }, { reactions: { _count: "desc" } }] : [{ isPinned: "desc" }, { createdAt: "desc" }],
  });
}

export async function createPost(data: { cohortId: string; title: string; content: string }, authorId: string) {
  await assertCohortAccess(authorId, data.cohortId);
  return prisma.post.create({
    data: { cohortId: data.cohortId, title: data.title, content: data.content, authorId },
    include: { author: authorSelect, _count: { select: { comments: true, reactions: true } } },
  });
}

async function getPostOrThrow(id: string) {
  const post = await prisma.post.findUnique({ where: { id } });
  if (!post) {
    throw new AppError("Post not found", 404);
  }
  return post;
}

export async function getPost(id: string, userId: string) {
  const post = await getPostOrThrow(id);
  if (post.cohortId) await assertCohortAccess(userId, post.cohortId);
  return prisma.post.findUnique({
    where: { id },
    include: {
      author: authorSelect,
      comments: {
        where: { parentCommentId: null },
        include: {
          author: authorSelect,
          reactions: { select: { id: true, userId: true, emoji: true } },
          replies: replySelect,
        },
        orderBy: { createdAt: "asc" },
      },
      _count: { select: { reactions: true } },
      reactions: { where: { userId }, select: { id: true, emoji: true } },
    },
  });
}

export async function deletePost(id: string, userId: string, isAdmin: boolean) {
  const post = await getPostOrThrow(id);
  if (post.authorId !== userId && !isAdmin) {
    throw new AppError("You can only delete your own posts", 403);
  }
  await prisma.post.delete({ where: { id } });
}

export async function addComment(
  postId: string,
  authorId: string,
  data: { content?: string; parentCommentId?: string; attachmentUrl?: string; attachmentType?: string }
) {
  const post = await getPostOrThrow(postId);
  if (post.cohortId) await assertCohortAccess(authorId, post.cohortId);

  const { content, parentCommentId, attachmentUrl, attachmentType } = data;

  if (parentCommentId) {
    const parent = await prisma.comment.findUnique({ where: { id: parentCommentId } });
    if (!parent || parent.postId !== postId) {
      throw new AppError("Parent comment not found", 404);
    }
  }

  const comment = await prisma.comment.create({
    data: { postId, content, authorId, parentCommentId, attachmentUrl, attachmentType },
    include: { author: authorSelect },
  });

  // Resolve course slug once — used by both reply and mention notifications.
  const courseSlug = post.cohortId
    ? (await prisma.cohort.findUnique({ where: { id: post.cohortId }, include: { course: { select: { slug: true } } } }))
        ?.course.slug
    : undefined;

  // Notify the reply target (parent comment author or post author).
  const notifyTargetId = parentCommentId
    ? (await prisma.comment.findUnique({ where: { id: parentCommentId } }))?.authorId
    : post.authorId;
  if (notifyTargetId && notifyTargetId !== authorId) {
    await notifyUser(notifyTargetId, "ANNOUNCEMENT", "New reply", `${comment.author.firstName} replied to your post.`, {
      postId,
      courseSlug,
      action: "view_discussion",
    }).catch(() => null);
  }

  // Notify each @mentioned user (skip author and the already-notified reply target).
  const mentionedIds = extractMentionedUserIds(content).filter(
    (id) => id !== authorId && id !== notifyTargetId
  );
  for (const mentionedId of mentionedIds) {
    await notifyUser(
      mentionedId,
      "ANNOUNCEMENT",
      "You were mentioned",
      `${comment.author.firstName} mentioned you in a comment.`,
      { postId, courseSlug, action: "view_discussion" }
    ).catch(() => null);
  }

  // Push a live-update event to all cohort members so their discussion pages refresh.
  if (post.cohortId) {
    const [enrollments, cohortMentors, managers] = await Promise.all([
      prisma.enrollment.findMany({ where: { cohortId: post.cohortId }, select: { userId: true } }),
      prisma.cohortMentor.findMany({ where: { cohortId: post.cohortId }, select: { userId: true } }),
      prisma.cohortManagerAssignment.findMany({ where: { cohortId: post.cohortId }, select: { userId: true } }),
    ]);
    const memberIds = [
      ...enrollments.map((e) => e.userId),
      ...cohortMentors.map((m) => m.userId),
      ...managers.map((m) => m.userId),
    ];
    emitToUsers([...new Set(memberIds)], "discussion_update", { postId, cohortId: post.cohortId });
  }

  return comment;
}

async function getCommentOrThrow(id: string) {
  const comment = await prisma.comment.findUnique({ where: { id } });
  if (!comment) {
    throw new AppError("Comment not found", 404);
  }
  return comment;
}

export async function setReaction(postId: string, userId: string, emoji = "👍") {
  const post = await getPostOrThrow(postId);
  if (post.cohortId) await assertCohortAccess(userId, post.cohortId);

  const existing = await prisma.reaction.findFirst({ where: { postId, userId } });
  if (existing) {
    if (existing.emoji === emoji) {
      await prisma.reaction.delete({ where: { id: existing.id } });
      return { reacted: false, emoji: null };
    }
    const updated = await prisma.reaction.update({ where: { id: existing.id }, data: { emoji } });
    return { reacted: true, emoji: updated.emoji };
  }
  const reaction = await prisma.reaction.create({ data: { postId, userId, emoji } });
  return { reacted: true, emoji: reaction.emoji };
}

export async function setCommentReaction(commentId: string, userId: string, emoji = "👍") {
  const comment = await getCommentOrThrow(commentId);
  const post = await getPostOrThrow(comment.postId);
  if (post.cohortId) await assertCohortAccess(userId, post.cohortId);

  const existing = await prisma.reaction.findFirst({ where: { commentId, userId } });
  if (existing) {
    if (existing.emoji === emoji) {
      await prisma.reaction.delete({ where: { id: existing.id } });
      return { reacted: false, emoji: null };
    }
    const updated = await prisma.reaction.update({ where: { id: existing.id }, data: { emoji } });
    return { reacted: true, emoji: updated.emoji };
  }
  const reaction = await prisma.reaction.create({ data: { commentId, userId, emoji } });
  return { reacted: true, emoji: reaction.emoji };
}

export async function editComment(commentId: string, userId: string, content: string) {
  const comment = await getCommentOrThrow(commentId);
  if (comment.authorId !== userId) throw new AppError("You can only edit your own comments", 403);
  return prisma.comment.update({
    where: { id: commentId },
    data: { content, editedAt: new Date() },
    include: { author: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, role: { select: { name: true } } } } },
  });
}

export async function deleteComment(commentId: string, userId: string, isAdmin: boolean) {
  const comment = await getCommentOrThrow(commentId);
  if (comment.authorId !== userId && !isAdmin) throw new AppError("You can only delete your own comments", 403);
  await prisma.comment.delete({ where: { id: commentId } });
}
