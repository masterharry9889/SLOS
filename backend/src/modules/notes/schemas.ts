import { z } from 'zod';

export const GenerateNotesSchema = z.object({
  depth: z.enum(['brief', 'standard', 'detailed']).default('standard'),
  mode: z.enum(['grounded', 'knowledge', 'notes', 'summary']).default('grounded'),
});

export const TopicParamsSchema = z.object({ chapterId: z.string().min(1) });
export const NoteParamsSchema = z.object({ noteId: z.string().min(1) });
export const UpdateNoteSchema = z.object({ content: z.string().min(1).max(200_000) });
