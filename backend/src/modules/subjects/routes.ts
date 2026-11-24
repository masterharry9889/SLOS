import type { FastifyInstance } from 'fastify';
import {
  CreateSubjectSchema,
  SubjectIdParamsSchema,
  UpdateSubjectSchema,
} from './schemas.js';
import {
  createSubject,
  deleteSubject,
  getSubject,
  listSubjects,
  updateSubject,
} from './service.js';
import { listSubjectDocuments } from '@/modules/documents/service.js';

export default async function subjectRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('onRequest', fastify.authenticate);

  fastify.get('/', async (request) => listSubjects(request.user!.id));

  fastify.post('/', async (request, reply) => {
    const body = CreateSubjectSchema.parse(request.body);
    const subject = await createSubject(request.user!.id, body);
    return reply.status(201).send(subject);
  });

  fastify.get('/:id', async (request) => {
    const { id } = SubjectIdParamsSchema.parse(request.params);
    return getSubject(request.user!.id, id);
  });

  fastify.get('/:id/documents', async (request) => {
    const { id } = SubjectIdParamsSchema.parse(request.params);
    return listSubjectDocuments(request.user!.id, id);
  });

  fastify.patch('/:id', async (request) => {
    const { id } = SubjectIdParamsSchema.parse(request.params);
    const body = UpdateSubjectSchema.parse(request.body);
    return updateSubject(request.user!.id, id, body);
  });

  fastify.delete('/:id', async (request, reply) => {
    const { id } = SubjectIdParamsSchema.parse(request.params);
    await deleteSubject(request.user!.id, id);
    return reply.status(204).send();
  });
}
