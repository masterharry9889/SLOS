import { z } from 'zod';

export const CreateProgressEventSchema = z.object({
  type: z.enum(['studied', 'revised', 'quiz_taken', 'study_session']),
  topicId: z.string().optional(),
  topic_id: z.string().optional(),
  durationMin: z.number().int().min(0).optional(),
  duration_minutes: z.number().int().min(0).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
