import { prisma } from "../lib/prisma";
import { AppError } from "../utils/AppError";
import { recomputeProgressForCourse } from "./progress.service";

type OptionInput = { text: string; isCorrect: boolean };
type QuestionInput = {
  text: string;
  type: "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "TRUE_FALSE";
  marks: number;
  options: OptionInput[];
};

type AssessmentInput = {
  courseId: string;
  moduleId?: string;
  lessonId?: string;
  kind: "QUIZ" | "ASSESSMENT";
  title: string;
  passingScore: number;
  timeLimitMinutes: number;
  maxAttempts: number;
  questions: QuestionInput[];
};

const summaryInclude = { _count: { select: { questions: true } } } as const;

export function listAssessments(filter: { courseId?: string; moduleId?: string; lessonId?: string }) {
  return prisma.assessment.findMany({
    where: filter,
    include: summaryInclude,
    orderBy: { createdAt: "desc" },
  });
}

export async function createAssessment(data: AssessmentInput, createdById: string) {
  return prisma.assessment.create({
    data: {
      courseId: data.courseId,
      moduleId: data.moduleId,
      lessonId: data.lessonId,
      kind: data.kind,
      title: data.title,
      passingScore: data.passingScore,
      timeLimitMinutes: data.timeLimitMinutes,
      maxAttempts: data.maxAttempts,
      createdById,
      questions: {
        create: data.questions.map((q, index) => ({
          text: q.text,
          type: q.type,
          marks: q.marks,
          order: index + 1,
          options: { create: q.options.map((o) => ({ text: o.text, isCorrect: o.isCorrect })) },
        })),
      },
    },
    include: { questions: { include: { options: true }, orderBy: { order: "asc" } } },
  });
}

async function getAssessmentOrThrow(id: string) {
  const assessment = await prisma.assessment.findUnique({ where: { id } });
  if (!assessment) {
    throw new AppError("Assessment not found", 404);
  }
  return assessment;
}

/** Admin/mentor view — includes correct-answer flags. */
export async function getAssessmentAdmin(id: string) {
  await getAssessmentOrThrow(id);
  return prisma.assessment.findUnique({
    where: { id },
    include: { questions: { include: { options: true }, orderBy: { order: "asc" } } },
  });
}

/** Student-facing view for taking the quiz — never exposes isCorrect. */
export async function getAssessmentForAttempt(id: string) {
  await getAssessmentOrThrow(id);
  const assessment = await prisma.assessment.findUnique({
    where: { id },
    include: {
      questions: {
        include: { options: { select: { id: true, text: true } } },
        orderBy: { order: "asc" },
      },
    },
  });
  return assessment;
}

export async function updateAssessment(
  id: string,
  data: Partial<{
    title: string;
    passingScore: number;
    timeLimitMinutes: number;
    maxAttempts: number;
    status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  }>
) {
  await getAssessmentOrThrow(id);
  return prisma.assessment.update({ where: { id }, data });
}

export async function deleteAssessment(id: string) {
  await getAssessmentOrThrow(id);
  await prisma.assessment.delete({ where: { id } });
}

export async function startAttempt(assessmentId: string, userId: string) {
  const assessment = await getAssessmentOrThrow(assessmentId);

  const existingAttempts = await prisma.assessmentAttempt.count({ where: { assessmentId, userId } });
  if (existingAttempts >= assessment.maxAttempts) {
    throw new AppError("You have used all attempts for this assessment", 403);
  }

  return prisma.assessmentAttempt.create({
    data: { assessmentId, userId, attemptNumber: existingAttempts + 1 },
  });
}

export async function submitAttempt(
  attemptId: string,
  userId: string,
  answers: { questionId: string; selectedOptionIds: string[] }[]
) {
  const attempt = await prisma.assessmentAttempt.findUnique({ where: { id: attemptId } });
  if (!attempt || attempt.userId !== userId) {
    throw new AppError("Attempt not found", 404);
  }
  if (attempt.status !== "IN_PROGRESS") {
    throw new AppError("This attempt has already been submitted", 409);
  }

  const questions = await prisma.question.findMany({
    where: { assessmentId: attempt.assessmentId },
    include: { options: true },
  });

  let totalMarks = 0;
  let earnedMarks = 0;

  for (const question of questions) {
    totalMarks += question.marks;
    const answer = answers.find((a) => a.questionId === question.id);
    const correctOptionIds = question.options.filter((o) => o.isCorrect).map((o) => o.id);
    const selectedIds = answer?.selectedOptionIds ?? [];
    const isCorrect =
      correctOptionIds.length === selectedIds.length && correctOptionIds.every((id) => selectedIds.includes(id));
    const marksAwarded = isCorrect ? question.marks : 0;
    earnedMarks += marksAwarded;

    const attemptAnswer = await prisma.attemptAnswer.upsert({
      where: { attemptId_questionId: { attemptId, questionId: question.id } },
      update: { isCorrect, marksAwarded },
      create: { attemptId, questionId: question.id, isCorrect, marksAwarded },
    });

    await prisma.attemptAnswerOption.deleteMany({ where: { attemptAnswerId: attemptAnswer.id } });
    if (selectedIds.length > 0) {
      await prisma.attemptAnswerOption.createMany({
        data: selectedIds.map((optionId) => ({ attemptAnswerId: attemptAnswer.id, optionId })),
      });
    }
  }

  const scorePercent = totalMarks > 0 ? Math.round((earnedMarks / totalMarks) * 100) : 0;

  const graded = await prisma.assessmentAttempt.update({
    where: { id: attemptId },
    data: { status: "GRADED", score: scorePercent, submittedAt: new Date() },
  });

  const assessment = await prisma.assessment.findUnique({ where: { id: attempt.assessmentId }, select: { courseId: true } });
  if (assessment) await recomputeProgressForCourse(userId, assessment.courseId);

  return graded;
}

export function listMyAttempts(assessmentId: string, userId: string) {
  return prisma.assessmentAttempt.findMany({
    where: { assessmentId, userId },
    orderBy: { attemptNumber: "asc" },
  });
}
