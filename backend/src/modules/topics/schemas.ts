import { z } from 'zod';

export const TopicStatusSchema = z.enum(['not_started', 'studied', 'revised', 'tested']);

export const SubjectIdParamsSchema = z.object({
  id: z.string().min(1),
});

export const TopicIdParamsSchema = z.object({
  id: z.string().min(1),
});

export const UpdateTopicSchema = z
  .object({
    title: z.string().trim().min(1).max(255).optional(),
    parentId: z.string().min(1).nullable().optional(),
    order: z.number().int().min(0).optional(),
    status: TopicStatusSchema.optional(),
    delete: z.boolean().optional(),
    action: z.enum(['delete']).optional(),
  })
  .passthrough()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one topic field must be supplied',
  });

export const ConfirmTopicsSchema = z
  .object({
    confirmed: z.boolean().optional(),
    sourceType: z.enum(['syllabus', 'content']).optional(),
  })
  .passthrough()
  .default({});

export const TopicTreeSchema = z.object({
  subject_title: z.string().optional(),
  source_type: z.enum(['syllabus', 'content']).optional(),
  units: z.array(z.object({
    id: z.string().optional(),
    title: z.string().trim().min(1).max(255),
    order: z.number().int().min(0).optional(),
    chapters: z.array(z.object({
      id: z.string().optional(),
      title: z.string().trim().min(1).max(255),
      order: z.number().int().min(0).optional(),
      status: TopicStatusSchema.optional(),
      source_spans: z.array(z.object({
        page: z.number().int().positive(),
        start: z.number().int().min(0),
        end: z.number().int().min(0),
      })).optional(),
      concepts: z.array(z.union([
        z.string().trim().min(1),
        z.object({ id: z.string().optional(), title: z.string().trim().min(1) }),
      ])).optional(),
    })),
  })),
});

export type UpdateTopicInput = z.infer<typeof UpdateTopicSchema>;
export type ConfirmTopicsInput = z.infer<typeof ConfirmTopicsSchema>;
