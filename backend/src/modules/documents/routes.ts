import type { FastifyInstance } from 'fastify';
import {
  CreateDocumentSchema,
  DocumentIdParamsSchema,
  UploadUrlSchema,
} from './schemas.js';
import {
  createDocument,
  createDocumentUploadUrl,
  getDocument,
} from './service.js';

export default async function documentRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('onRequest', fastify.authenticate);

  fastify.post('/upload-url', {
    config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    const body = UploadUrlSchema.parse(request.body);
    return reply.status(201).send(await createDocumentUploadUrl(request.user!.id, body));
  });

  fastify.post('/', {
    config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    const body = CreateDocumentSchema.parse(request.body);
    return reply.status(201).send(await createDocument(request.user!.id, body));
  });

  fastify.get('/:id', async (request) => {
    const { id } = DocumentIdParamsSchema.parse(request.params);
    return getDocument(request.user!.id, id);
  });

}
