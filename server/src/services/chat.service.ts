import { prisma } from "../lib/prisma";
import { AppError } from "../utils/AppError";

const contactSelect = {
  id: true,
  firstName: true,
  lastName: true,
  avatarUrl: true,
  role: { select: { name: true } },
} as const;

const senderSelect = { select: contactSelect } as const;

function dmKeyFor(userIdA: string, userIdB: string) {
  return [userIdA, userIdB].sort().join("_");
}

async function getUserWithRole(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: { select: { name: true } } } });
  if (!user) throw new AppError("User not found", 404);
  return user;
}

async function mentorAndManagerShareCohort(mentorId: string, managerId: string) {
  const mentorCohorts = await prisma.cohortMentor.findMany({ where: { userId: mentorId }, select: { cohortId: true } });
  if (mentorCohorts.length === 0) return false;
  const overlap = await prisma.cohortManagerAssignment.findFirst({
    where: { userId: managerId, cohortId: { in: mentorCohorts.map((c) => c.cohortId) } },
  });
  return Boolean(overlap);
}

async function managerAndStudentShareCohort(managerId: string, studentId: string) {
  const managerCohorts = await prisma.cohortManagerAssignment.findMany({ where: { userId: managerId }, select: { cohortId: true } });
  if (managerCohorts.length === 0) return false;
  const overlap = await prisma.enrollment.findFirst({
    where: { userId: studentId, cohortId: { in: managerCohorts.map((c) => c.cohortId) } },
  });
  return Boolean(overlap);
}

/** Mentor<->Student is only allowed when they share a cohort AND the student's enrollment in that specific cohort is Intensive Pro — never a global "any Intensive Pro enrollment" check, since this is a per-cohort relationship. */
async function mentorAndStudentShareIntensiveProCohort(mentorId: string, studentId: string) {
  const mentorCohorts = await prisma.cohortMentor.findMany({ where: { userId: mentorId }, select: { cohortId: true } });
  if (mentorCohorts.length === 0) return false;
  const overlap = await prisma.enrollment.findFirst({
    where: { userId: studentId, cohortId: { in: mentorCohorts.map((c) => c.cohortId) }, plan: "INTENSIVE_PRO" },
  });
  return Boolean(overlap);
}

async function studentsShareCohort(studentIdA: string, studentIdB: string) {
  const enrollmentsA = await prisma.enrollment.findMany({ where: { userId: studentIdA }, select: { cohortId: true } });
  if (enrollmentsA.length === 0) return false;
  const overlap = await prisma.enrollment.findFirst({
    where: { userId: studentIdB, cohortId: { in: enrollmentsA.map((e) => e.cohortId) } },
  });
  return Boolean(overlap);
}

/**
 * The chat permission matrix, exactly as specified:
 * - Admin <-> Cohort Manager: always allowed.
 * - Admin <-> Mentor: always allowed.
 * - Admin <-> Student: NOT allowed — no direct Admin/student interaction at all (Admin is not a
 *   universal contact; students don't see Admin in their directory either).
 * - Mentor <-> Cohort Manager: only if they share a cohort (mentor mentors it, manager manages it).
 * - Cohort Manager <-> Student: only if the manager manages a cohort the student is enrolled in.
 * - Student <-> Student: only if they share a cohort enrollment (classmates).
 * - Mentor <-> Student: only if they share a cohort AND the student's enrollment in that cohort is Intensive Pro.
 * - Every other combination (Mentor<->Mentor, Manager<->Manager, Admin<->Admin): not allowed.
 */
export async function canDirectMessage(userIdA: string, userIdB: string) {
  if (userIdA === userIdB) return false;
  const [a, b] = await Promise.all([getUserWithRole(userIdA), getUserWithRole(userIdB)]);
  const roleA = a.role.name;
  const roleB = b.role.name;

  const pair = [roleA, roleB].sort().join("|");

  if (pair === "Admin|Cohort Manager") return true;
  if (pair === "Admin|Mentor") return true;
  if (pair === "Cohort Manager|Mentor") {
    const mentorId = roleA === "Mentor" ? userIdA : userIdB;
    const managerId = roleA === "Cohort Manager" ? userIdA : userIdB;
    return mentorAndManagerShareCohort(mentorId, managerId);
  }
  if (pair === "Cohort Manager|Student") {
    const studentId = roleA === "Student" ? userIdA : userIdB;
    const managerId = roleA === "Cohort Manager" ? userIdA : userIdB;
    return managerAndStudentShareCohort(managerId, studentId);
  }
  if (pair === "Student|Student") {
    return studentsShareCohort(userIdA, userIdB);
  }
  if (pair === "Mentor|Student") {
    const mentorId = roleA === "Mentor" ? userIdA : userIdB;
    const studentId = roleA === "Student" ? userIdA : userIdB;
    return mentorAndStudentShareIntensiveProCohort(mentorId, studentId);
  }
  return false;
}

type ContactBase = { id: string; firstName: string; lastName: string; avatarUrl: string | null; role: { name: string } };
/** `locked: true` means "visible in the directory but messaging isn't allowed yet" — the Mentor<->Student pairing is locked per-contact unless that student's enrollment in their shared cohort is Intensive Pro. The UI shows these contacts with a lock icon rather than hiding them outright. */
type Contact = ContactBase & { locked: boolean };

function dedupeById(users: ContactBase[]) {
  const seen = new Map<string, ContactBase>();
  for (const u of users) seen.set(u.id, u);
  return Array.from(seen.values());
}

function unlocked(users: ContactBase[]): Contact[] {
  return users.map((u) => ({ ...u, locked: false }));
}

/**
 * Grouped directory for the chat "find people" tabs. Most contacts here are fully messageable;
 * Mentor<->Student entries are included too (so each side can see who the other is — their
 * cohort's mentor, or a mentor's enrolled students) but flagged `locked: true` since that
 * messaging pairing is a deferred premium feature, not yet allowed. `getOrCreateConversation`
 * independently re-checks `canDirectMessage` server-side regardless of what this returns, so a
 * locked contact can never actually be messaged even if the client ignored the flag.
 */
export async function getEligibleContacts(userId: string): Promise<{
  admins: Contact[];
  managers: Contact[];
  mentors: Contact[];
  students: Contact[];
}> {
  const me = await getUserWithRole(userId);
  const roleName = me.role.name;

  if (roleName === "Admin") {
    // Admin can only chat with Cohort Managers and Mentors — no direct student interaction at all.
    const users = await prisma.user.findMany({
      where: { id: { not: userId }, role: { name: { in: ["Cohort Manager", "Mentor"] } } },
      select: contactSelect,
      orderBy: { firstName: "asc" },
    });
    return {
      admins: [],
      managers: unlocked(users.filter((u) => u.role.name === "Cohort Manager")),
      mentors: unlocked(users.filter((u) => u.role.name === "Mentor")),
      students: [],
    };
  }

  // Admin is a contact for Mentor and Cohort Manager, but never for Student — students don't see
  // Admin in their directory at all, matching the "no direct student interaction" rule above.
  const admins =
    roleName === "Mentor" || roleName === "Cohort Manager"
      ? unlocked(await prisma.user.findMany({ where: { role: { name: "Admin" } }, select: contactSelect, orderBy: { firstName: "asc" } }))
      : [];

  if (roleName === "Mentor") {
    const mentorCohorts = await prisma.cohortMentor.findMany({ where: { userId }, select: { cohortId: true } });
    const cohortIds = mentorCohorts.map((c) => c.cohortId);
    const [managerLinks, studentLinks] = await Promise.all([
      cohortIds.length ? prisma.cohortManagerAssignment.findMany({ where: { cohortId: { in: cohortIds } }, select: { userId: true } }) : [],
      cohortIds.length ? prisma.enrollment.findMany({ where: { cohortId: { in: cohortIds } }, select: { userId: true } }) : [],
    ]);
    const managers = managerLinks.length
      ? unlocked(dedupeById(await prisma.user.findMany({ where: { id: { in: managerLinks.map((m) => m.userId) } }, select: contactSelect })))
      : [];
    const students = studentLinks.length
      ? await Promise.all(
          dedupeById(await prisma.user.findMany({ where: { id: { in: studentLinks.map((s) => s.userId) } }, select: contactSelect })).map(
            async (u) => ({ ...u, locked: !(await mentorAndStudentShareIntensiveProCohort(userId, u.id)) })
          )
        )
      : [];
    return { admins, managers, mentors: [], students };
  }

  if (roleName === "Cohort Manager") {
    const managedCohorts = await prisma.cohortManagerAssignment.findMany({ where: { userId }, select: { cohortId: true } });
    const cohortIds = managedCohorts.map((c) => c.cohortId);
    const [mentorLinks, studentLinks] = await Promise.all([
      cohortIds.length ? prisma.cohortMentor.findMany({ where: { cohortId: { in: cohortIds } }, select: { userId: true } }) : [],
      cohortIds.length ? prisma.enrollment.findMany({ where: { cohortId: { in: cohortIds } }, select: { userId: true } }) : [],
    ]);
    const mentors = mentorLinks.length
      ? unlocked(dedupeById(await prisma.user.findMany({ where: { id: { in: mentorLinks.map((m) => m.userId) } }, select: contactSelect })))
      : [];
    const students = studentLinks.length
      ? unlocked(dedupeById(await prisma.user.findMany({ where: { id: { in: studentLinks.map((s) => s.userId) } }, select: contactSelect })))
      : [];
    return { admins, managers: [], mentors, students };
  }

  if (roleName === "Student") {
    const enrollments = await prisma.enrollment.findMany({ where: { userId }, select: { cohortId: true } });
    const cohortIds = enrollments.map((e) => e.cohortId);
    const [managerLinks, mentorLinks, studentLinks] = await Promise.all([
      cohortIds.length ? prisma.cohortManagerAssignment.findMany({ where: { cohortId: { in: cohortIds } }, select: { userId: true } }) : [],
      cohortIds.length ? prisma.cohortMentor.findMany({ where: { cohortId: { in: cohortIds } }, select: { userId: true } }) : [],
      cohortIds.length
        ? prisma.enrollment.findMany({ where: { cohortId: { in: cohortIds }, userId: { not: userId } }, select: { userId: true } })
        : [],
    ]);
    const managers = managerLinks.length
      ? unlocked(dedupeById(await prisma.user.findMany({ where: { id: { in: managerLinks.map((m) => m.userId) } }, select: contactSelect })))
      : [];
    const mentors = mentorLinks.length
      ? await Promise.all(
          dedupeById(await prisma.user.findMany({ where: { id: { in: mentorLinks.map((m) => m.userId) } }, select: contactSelect })).map(
            async (u) => ({ ...u, locked: !(await mentorAndStudentShareIntensiveProCohort(u.id, userId)) })
          )
        )
      : [];
    const students = studentLinks.length
      ? unlocked(dedupeById(await prisma.user.findMany({ where: { id: { in: studentLinks.map((s) => s.userId) } }, select: contactSelect })))
      : [];
    return { admins, managers, mentors, students };
  }

  return { admins, managers: [], mentors: [], students: [] };
}

export async function getOrCreateConversation(userIdA: string, userIdB: string) {
  if (userIdA === userIdB) {
    throw new AppError("You can't message yourself", 422);
  }
  const allowed = await canDirectMessage(userIdA, userIdB);
  if (!allowed) {
    throw new AppError("You don't have permission to message this person", 403);
  }

  const dmKey = dmKeyFor(userIdA, userIdB);
  let conversation = await prisma.conversation.findUnique({ where: { dmKey } });
  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: { dmKey, participants: { create: [{ userId: userIdA }, { userId: userIdB }] } },
    });
  }
  return conversation;
}

async function assertParticipant(conversationId: string, userId: string) {
  const participant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  });
  if (!participant) {
    throw new AppError("You don't have access to this conversation", 403);
  }
}

export async function listMyConversations(userId: string) {
  const memberships = await prisma.conversationParticipant.findMany({
    where: { userId },
    select: { conversationId: true, lastReadAt: true, pinned: true },
  });

  const enriched = await Promise.all(
    memberships.map(async (m) => {
      const other = await prisma.conversationParticipant.findFirst({
        where: { conversationId: m.conversationId, userId: { not: userId } },
        include: { user: { select: contactSelect } },
      });
      if (!other) return null;

      const lastMessage = await prisma.chatMessage.findFirst({
        where: { conversationId: m.conversationId },
        orderBy: { createdAt: "desc" },
      });
      const unreadCount = await prisma.chatMessage.count({
        where: {
          conversationId: m.conversationId,
          createdAt: { gt: m.lastReadAt ?? new Date(0) },
          senderId: { not: userId },
        },
      });

      /**
       * Re-checked live (not just "this conversation exists") — e.g. a Mentor<->Student
       * conversation created while the student held Intensive Pro must stop being messageable the
       * moment that student no longer does (plan downgrade), without deleting the conversation's
       * history. Reuses the exact same matrix `getOrCreateConversation`/`sendMessage` enforce, so
       * this can never drift from what the server will actually allow.
       */
      const canMessage = await canDirectMessage(userId, other.user.id);

      return { id: m.conversationId, otherUser: other.user, lastMessage, unreadCount, pinned: m.pinned, canMessage };
    })
  );

  return enriched
    .filter((c): c is NonNullable<typeof c> => c !== null)
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return (b.lastMessage?.createdAt.getTime() ?? 0) - (a.lastMessage?.createdAt.getTime() ?? 0);
    });
}

export async function setConversationPinned(conversationId: string, userId: string, pinned: boolean) {
  await assertParticipant(conversationId, userId);
  await prisma.conversationParticipant.update({
    where: { conversationId_userId: { conversationId, userId } },
    data: { pinned },
  });
  return { pinned };
}

const messageInclude = {
  sender: senderSelect,
  reactions: { select: { id: true, userId: true, emoji: true } },
} as const;

export async function listMessages(conversationId: string, userId: string, since?: Date) {
  await assertParticipant(conversationId, userId);
  return prisma.chatMessage.findMany({
    where: { conversationId, ...(since ? { createdAt: { gt: since } } : {}) },
    include: messageInclude,
    orderBy: { createdAt: "asc" },
  });
}

export async function sendMessage(
  conversationId: string,
  userId: string,
  data: { content?: string; attachmentUrl?: string; attachmentType?: string }
) {
  await assertParticipant(conversationId, userId);

  const other = await prisma.conversationParticipant.findFirst({
    where: { conversationId, userId: { not: userId } },
    select: { userId: true },
  });
  if (other && !(await canDirectMessage(userId, other.userId))) {
    throw new AppError("You no longer have permission to message this person — your plan may have changed", 403);
  }

  if (!data.content && !data.attachmentUrl) {
    throw new AppError("A message needs text or an attachment", 422);
  }

  const message = await prisma.chatMessage.create({
    data: {
      conversationId,
      senderId: userId,
      content: data.content,
      attachmentUrl: data.attachmentUrl,
      attachmentType: data.attachmentType,
    },
    include: messageInclude,
  });

  await prisma.conversationParticipant.update({
    where: { conversationId_userId: { conversationId, userId } },
    data: { lastReadAt: new Date() },
  });

  return message;
}

export async function markRead(conversationId: string, userId: string) {
  await assertParticipant(conversationId, userId);
  await prisma.conversationParticipant.update({
    where: { conversationId_userId: { conversationId, userId } },
    data: { lastReadAt: new Date() },
  });
}

export async function setMessageReaction(messageId: string, userId: string, emoji = "👍") {
  const message = await prisma.chatMessage.findUnique({ where: { id: messageId } });
  if (!message) {
    throw new AppError("Message not found", 404);
  }
  await assertParticipant(message.conversationId, userId);

  const existing = await prisma.reaction.findFirst({ where: { messageId, userId } });
  if (existing) {
    if (existing.emoji === emoji) {
      await prisma.reaction.delete({ where: { id: existing.id } });
      return { reacted: false, emoji: null };
    }
    const updated = await prisma.reaction.update({ where: { id: existing.id }, data: { emoji } });
    return { reacted: true, emoji: updated.emoji };
  }
  const reaction = await prisma.reaction.create({ data: { messageId, userId, emoji } });
  return { reacted: true, emoji: reaction.emoji };
}
