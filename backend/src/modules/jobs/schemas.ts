import { z } from 'zod';

export const JobIdParamsSchema = z.object({
  id: z.string().min(1),
});

export const AgentCallbackSchema = z.object({
  job_id: z.string().min(1),
  status: z.enum(['completed', 'failed']),
  result: z.unknown().optional(),
  error: z.string().min(1).optional(),
});

export type AgentCallbackInput = z.infer<typeof AgentCallbackSchema>;
