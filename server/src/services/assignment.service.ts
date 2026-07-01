import { prisma } from "../lib/prisma";
import { AppError } from "../utils/AppError";
import { notifyUser } from "./notification.service";
import { recomputeProgressForCourse } from "./progress.service";

type AssignmentInput = {
  courseId: string;
  moduleId?: string;
  lessonId?: string;
  title: string;
  description?: string;
  dueDate?: string;
  maxMarks: number;
};

const submissionInclude = { user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } } as const;

export function listAssignments(filter: { courseId?: string; moduleId?: string; lessonId?: string }) {
  return prisma.assignment.findMany({
    where: filter,
    include: { _count: { select: { submissions: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export function createAssignment(data: AssignmentInput, createdById: string) {
  return prisma.assignment.create({
    data: {
      courseId: data.courseId,
      moduleId: data.moduleId,
      lessonId: data.lessonId,
      title: data.title,
      description: data.description,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      maxMarks: data.maxMarks,
      createdById,
    },
  });
}

async function getAssignmentOrThrow(id: string) {
  const assignment = await prisma.assignment.findUnique({ where: { id } });
  if (!assignment) {
    throw new AppError("Assignment not found", 404);
  }
  return assignment;
}

export async function updateAssignment(
  id: string,
  data: Partial<{ title: string; description: string; dueDate: string; maxMarks: number }>
) {
  await getAssignmentOrThrow(id);
  const { dueDate, ...rest } = data;
  return prisma.assignment.update({
    where: { id },
    data: { ...rest, dueDate: dueDate ? new Date(dueDate) : undefined },
  });
}

export async function deleteAssignment(id: string) {
  await getAssignmentOrThrow(id);
  await prisma.assignment.delete({ where: { id } });
}

/** A student's own submission for an assignment, if any — null means "not submitted yet." */
export function getMySubmission(assignmentId: string, userId: string) {
  return prisma.submission.findUnique({ where: { assignmentId_userId: { assignmentId, userId } } });
}

export function listSubmissions(assignmentId: string) {
  return prisma.submission.findMany({
    where: { assignmentId },
    include: submissionInclude,
    orderBy: { submittedAt: "desc" },
  });
}

export async function submitAssignment(
  assignmentId: string,
  userId: string,
  data: { content?: string; fileUrl?: string }
) {
  await getAssignmentOrThrow(assignmentId);
  if (!data.content && !data.fileUrl) {
    throw new AppError("Submit some text content or a file link", 422);
  }

  const existing = await prisma.submission.findUnique({ where: { assignmentId_userId: { assignmentId, userId } } });
  if (existing && existing.status === "GRADED") {
    return prisma.submission.update({
      where: { id: existing.id },
      data: { content: data.content, fileUrl: data.fileUrl, status: "RESUBMITTED", submittedAt: new Date() },
    });
  }

  return prisma.submission.upsert({
    where: { assignmentId_userId: { assignmentId, userId } },
    update: { content: data.content, fileUrl: data.fileUrl, status: "SUBMITTED", submittedAt: new Date() },
    create: { assignmentId, userId, content: data.content, fileUrl: data.fileUrl, status: "SUBMITTED" },
  });
}

export async function gradeSubmission(
  submissionId: string,
  gradedById: string,
  data: { marksObtained: number; feedback?: string }
) {
  const submission = await prisma.submission.findUnique({ where: { id: submissionId }, include: { assignment: true } });
  if (!submission) {
    throw new AppError("Submission not found", 404);
  }

  const graded = await prisma.submission.update({
    where: { id: submissionId },
    data: { marksObtained: data.marksObtained, feedback: data.feedback, status: "GRADED", gradedById, gradedAt: new Date() },
  });

  await recomputeProgressForCourse(submission.userId, submission.assignment.courseId);
  await notifyUser(
    submission.userId,
    "ASSIGNMENT_GRADED",
    "Assignment graded",
    `"${submission.assignment.title}" was graded: ${data.marksObtained}/${submission.assignment.maxMarks}.`,
    { assignmentId: submission.assignmentId, action: "view_assignment" }
  ).catch(() => null);

  return graded;
}
