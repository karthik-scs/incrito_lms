import { z } from "zod";

export const createAssignmentSchema = z.object({
  courseId: z.string().min(1),
  moduleId: z.string().min(1).optional(),
  lessonId: z.string().min(1).optional(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  dueDate: z.string().datetime().optional(),
  maxMarks: z.number().int().positive(),
});

export const updateAssignmentSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  dueDate: z.string().datetime().optional(),
  maxMarks: z.number().int().positive().optional(),
});

export const submitAssignmentSchema = z.object({
  content: z.string().max(5000).optional(),
  fileUrl: z.string().url().optional(),
});

export const gradeSubmissionSchema = z.object({
  marksObtained: z.number().int().min(0),
  feedback: z.string().max(2000).optional(),
});
