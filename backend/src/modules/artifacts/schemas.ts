import { z } from 'zod';

export const GenerateCheatsheetSchema = z.object({
  subject_id: z.string().min(1),
  scope: z.enum(['chapter', 'unit', 'subject']),
  scope_id: z.string().min(1),
  format: z.enum(['one_page', 'formulas_only', 'last_minute']),
});

export const GeneratePaperSchema = z.object({
  subject_id: z.string().min(1),
  chapter_ids: z.array(z.string().min(1)).min(1),
  total_marks: z.number().int().positive(),
  duration_minutes: z.number().int().positive(),
  difficulty_mix: z.object({
    easy: z.number().min(0).max(100),
    medium: z.number().min(0).max(100),
    hard: z.number().min(0).max(100),
  }).refine((mix) => mix.easy + mix.medium + mix.hard === 100),
  question_types: z.array(z.object({
    type: z.enum(['mcq', 'short_answer', 'long_answer', 'numerical', 'true_false']),
    count: z.number().int().min(0),
    marks_each: z.number().int().positive(),
  })).min(1),
  past_paper_document_id: z.string().optional(),
}).refine((input) => input.question_types.reduce(
  (sum, question) => sum + question.count * question.marks_each,
  0,
) === input.total_marks);

export const ArtifactParamsSchema = z.object({ id: z.string().min(1) });
export const ArtifactQuerySchema = z.object({
  subject_id: z.string().optional(),
  type: z.enum(['cheatsheet', 'question_paper']).optional(),
});
