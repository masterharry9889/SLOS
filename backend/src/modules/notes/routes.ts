import type { FastifyInstance } from 'fastify';
import { GenerateNotesSchema, NoteParamsSchema, TopicParamsSchema, UpdateNoteSchema } from './schemas.js';
import { createNoteVersion, enqueueNotes, getNote, listSubjectNotes, listTopicNotes } from './service.js';
import { AppError } from '@/lib/errors.js';

export default async function noteRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('onRequest', fastify.authenticate);
  fastify.post('/topics/:chapterId/notes/generate', {
    config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    const { chapterId } = TopicParamsSchema.parse(request.params);
    const body = GenerateNotesSchema.parse(request.body ?? {});
    return reply.status(202).send(await enqueueNotes(request.user!.id, chapterId, body));
  });
  fastify.get('/topics/:chapterId/notes', async (request) => {
    const { chapterId } = TopicParamsSchema.parse(request.params);
    return listTopicNotes(request.user!.id, chapterId);
  });
  fastify.get('/subjects/:subjectId/notes', async (request) => {
    const { subjectId } = z.object({ subjectId: z.string().min(1) }).parse(request.params);
    return listSubjectNotes(request.user!.id, subjectId);
  });
  fastify.get('/notes/:noteId', async (request) => {
    const { noteId } = NoteParamsSchema.parse(request.params);
    return getNote(request.user!.id, noteId);
  });
  fastify.patch('/notes/:noteId', async (request) => {
    const { noteId } = NoteParamsSchema.parse(request.params);
    const { content } = UpdateNoteSchema.parse(request.body);
    return createNoteVersion(request.user!.id, noteId, content);
  });
  fastify.post('/notes/generate', {
    config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    const body = zNotesLegacy.parse(request.body);
    return reply.status(202).send(await enqueueNotes(request.user!.id, body.chapter_id, {
      depth: body.depth,
      mode: body.mode ?? 'grounded',
    }));
  });
}

import { z } from 'zod';
const zNotesLegacy = z.object({
  chapter_id: z.string().min(1),
  depth: z.enum(['brief', 'standard', 'detailed']).default('standard'),
  mode: z.enum(['grounded', 'knowledge', 'notes', 'summary']).optional(),
});
