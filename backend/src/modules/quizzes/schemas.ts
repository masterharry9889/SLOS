import { z } from 'zod';

export const CreateQuizSchema = z.object({
  subjectId: z.string().min(1).optional(),
  subject_id: z.string().min(1).optional(),
  title: z.string().trim().min(1).max(255),
  questions: z.array(z.record(z.string(), z.unknown())).min(1),
  topicIds: z.array(z.string().min(1)).optional(),
  topic_ids: z.array(z.string().min(1)).optional(),
}).refine((value) => Boolean(value.subjectId ?? value.subject_id));
export const QuizIdSchema = z.object({ id: z.string().min(1) });
export const QuizParamsSchema = z.object({ quizId: z.string().min(1) });
export const AttemptAnswersSchema = z.object({
  answers: z.array(z.object({
    question_id: z.string().min(1),
    answer: z.string(),
    time_spent_seconds: z.number().int().min(0).optional(),
  })),
});
