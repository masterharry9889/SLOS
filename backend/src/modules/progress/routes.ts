import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { CreateProgressEventSchema } from './schemas.js';
import { createProgressEvent, getDashboard, logStudySession } from './service.js';

const StudySessionSchema = z.object({
  chapter_id: z.string().min(1),
  subject_id: z.string().min(1),
  duration_seconds: z.number().int().positive(),
});

export default async function progressRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('onRequest', fastify.authenticate);
  fastify.post('/progress/events', async (request, reply) => reply.status(201).send(
    await createProgressEvent(request.user!.id, CreateProgressEventSchema.parse(request.body)),
  ));
  fastify.post('/study-sessions', async (request, reply) => reply.status(201).send(
    await logStudySession(request.user!.id, StudySessionSchema.parse(request.body)),
  ));
  fastify.get('/progress/dashboard', async (request) => getDashboard(request.user!.id));
  fastify.get('/dashboard', async (request) => getDashboard(request.user!.id));
}
