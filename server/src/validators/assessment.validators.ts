import { z } from "zod";

const optionSchema = z.object({
  text: z.string().min(1).max(300),
  isCorrect: z.boolean().default(false),
});

const questionSchema = z.object({
  text: z.string().min(1).max(500),
  type: z.enum(["SINGLE_CHOICE", "MULTIPLE_CHOICE", "TRUE_FALSE"]).default("SINGLE_CHOICE"),
  marks: z.number().int().positive().default(1),
  options: z.array(optionSchema).min(2),
});

export const createAssessmentSchema = z.object({
  courseId: z.string().min(1),
  moduleId: z.string().min(1).optional(),
  lessonId: z.string().min(1).optional(),
  kind: z.enum(["QUIZ", "ASSESSMENT"]).default("QUIZ"),
  title: z.string().min(1).max(200),
  passingScore: z.number().int().min(0).max(100),
  timeLimitMinutes: z.number().int().positive(),
  maxAttempts: z.number().int().positive().default(1),
  questions: z.array(questionSchema).min(1),
});

export const updateAssessmentSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  passingScore: z.number().int().min(0).max(100).optional(),
  timeLimitMinutes: z.number().int().positive().optional(),
  maxAttempts: z.number().int().positive().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
});

export const submitAttemptSchema = z.object({
  answers: z
    .array(
      z.object({
        questionId: z.string().min(1),
        selectedOptionIds: z.array(z.string().min(1)),
      })
    )
    .min(1),
});
