import { z } from 'zod';

const dateInput = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), 'Invalid date')
  .transform((value) => new Date(value))
  .nullable()
  .optional();

export const CreateSubjectSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).nullable().optional(),
  examDate: dateInput,
});

export const UpdateSubjectSchema = z
  .object({
    title: z.string().trim().min(1).max(120).optional(),
    description: z.string().trim().max(500).nullable().optional(),
    examDate: dateInput,
  })
  .refine((value) => Object.keys(value).length > 0, 'At least one field must be provided');

export const SubjectIdParamsSchema = z.object({ id: z.string().min(1) });

export type CreateSubjectInput = z.infer<typeof CreateSubjectSchema>;
export type UpdateSubjectInput = z.infer<typeof UpdateSubjectSchema>;
