import { z } from 'zod';

// ==========================================
// Authentication Schemas
// ==========================================

export const loginSchema = z.object({
  email: z.string().trim().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Name is too long'),
  email: z.string().trim().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters').max(128, 'Password is too long'),
});

export type RegisterInput = z.infer<typeof registerSchema>;

// ==========================================
// Subject Schemas
// ==========================================

export const createSubjectSchema = z.object({
  title: z.string().trim().min(1, 'Subject title is required').max(120, 'Title is too long'),
  description: z.string().trim().max(500, 'Description is too long').optional(),
  color: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Must be a valid hex color code (e.g. #3b82f6)'),
  exam_date: z
    .string()
    .optional()
    .refine((val) => !val || !isNaN(Date.parse(val)), {
      message: 'Invalid date format',
    }),
});

export type CreateSubjectInput = z.infer<typeof createSubjectSchema>;

export const updateSubjectSchema = createSubjectSchema.partial();
export type UpdateSubjectInput = z.infer<typeof updateSubjectSchema>;

// ==========================================
// Note Generation Schemas
// ==========================================

export const noteDepthEnum = z.enum(['brief', 'standard', 'detailed']);

export const generateNotesSchema = z.object({
  chapter_id: z.string().min(1, 'Chapter ID is required'),
  depth: noteDepthEnum,
});

export type GenerateNotesInput = z.infer<typeof generateNotesSchema>;

// ==========================================
// Cheat Sheet Schemas
// ==========================================

export const cheatSheetScopeEnum = z.enum(['chapter', 'unit', 'subject']);
export const cheatSheetFormatEnum = z.enum(['one_page', 'formulas_only', 'last_minute']);

export const generateCheatSheetSchema = z.object({
  subject_id: z.string().min(1, 'Subject ID is required'),
  scope: cheatSheetScopeEnum,
  scope_id: z.string().min(1, 'Scope ID is required'),
  format: cheatSheetFormatEnum,
});

export type GenerateCheatSheetInput = z.infer<typeof generateCheatSheetSchema>;

// ==========================================
// Question Paper Schemas
// ==========================================

export const questionTypeEnum = z.enum([
  'mcq',
  'short_answer',
  'long_answer',
  'numerical',
  'true_false',
]);

export const questionTypeConfigSchema = z.object({
  type: questionTypeEnum,
  count: z.number().int().min(0, 'Count must be 0 or more'),
  marks_each: z.number().int().min(1, 'Marks each must be at least 1'),
});

export const difficultyMixSchema = z
  .object({
    easy: z.number().min(0, 'Must be >= 0').max(100, 'Must be <= 100'),
    medium: z.number().min(0, 'Must be >= 0').max(100, 'Must be <= 100'),
    hard: z.number().min(0, 'Must be >= 0').max(100, 'Must be <= 100'),
  })
  .refine((mix) => mix.easy + mix.medium + mix.hard === 100, {
    message: 'Difficulty mix percentages must sum up to exactly 100%',
    path: ['easy'],
  });

export const generateQuestionPaperSchema = z
  .object({
    subject_id: z.string().min(1, 'Subject ID is required'),
    chapter_ids: z.array(z.string().min(1)).min(1, 'At least one chapter must be selected'),
    total_marks: z.number().int().positive('Total marks must be positive'),
    duration_minutes: z.number().int().positive('Duration must be positive'),
    difficulty_mix: difficultyMixSchema,
    question_types: z
      .array(questionTypeConfigSchema)
      .min(1, 'At least one question type is required'),
    past_paper_document_id: z.string().optional(),
  })
  .refine(
    (data) => {
      const calculatedTotal = data.question_types.reduce(
        (sum, item) => sum + item.count * item.marks_each,
        0
      );
      return calculatedTotal === data.total_marks;
    },
    {
      message: 'The total marks calculated from question types must equal the specified total marks',
      path: ['total_marks'],
    }
  );

export type GenerateQuestionPaperInput = z.infer<typeof generateQuestionPaperSchema>;

// ==========================================
// Chat Schemas
// ==========================================

export const chatLevelEnum = z.enum(['simple', 'exam', 'advanced']);

export const sendChatSchema = z.object({
  subject_id: z.string().min(1, 'Subject ID is required'),
  chapter_id: z.string().optional(),
  message: z.string().trim().min(1, 'Message cannot be empty'),
  level: chatLevelEnum.default('simple'),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
      })
    )
    .default([]),
});

export type SendChatInput = z.infer<typeof sendChatSchema>;

// ==========================================
// Profile & User Settings Schemas
// ==========================================

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100).optional(),
  avatar_url: z
    .string()
    .refine(
      (val) =>
        !val ||
        val.startsWith('http://') ||
        val.startsWith('https://') ||
        val.startsWith('data:image/') ||
        val.startsWith('/'),
      { message: 'Must be a valid URL or image' }
    )
    .optional()
    .or(z.literal('')),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const userSettingsSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).default('system'),
  language: z.string().default('en'),
});

export type UserSettingsInput = z.infer<typeof userSettingsSchema>;
