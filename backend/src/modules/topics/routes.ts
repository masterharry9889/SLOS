import type { FastifyInstance } from 'fastify';
import { ConfirmTopicsSchema, SubjectIdParamsSchema, TopicIdParamsSchema, TopicTreeSchema, UpdateTopicSchema } from './schemas.js';
import { confirmSubjectTopics, getSubjectTopics, saveSubjectTopicTree, updateTopic } from './service.js';

export default async function topicRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('onRequest', fastify.authenticate);

  fastify.get('/subjects/:id/topics', async (request) => {
    const { id } = SubjectIdParamsSchema.parse(request.params);
    return getSubjectTopics(request.user!.id, id);
  });

  fastify.post('/subjects/:id/topics/confirm', async (request) => {
    const { id } = SubjectIdParamsSchema.parse(request.params);
    const body = ConfirmTopicsSchema.parse(request.body ?? {});
    return confirmSubjectTopics(request.user!.id, id, body);
  });

  fastify.put('/subjects/:id/topic-tree', async (request) => {
    const { id } = SubjectIdParamsSchema.parse(request.params);
    const body = TopicTreeSchema.parse(request.body);
    return saveSubjectTopicTree(request.user!.id, id, body);
  });

  fastify.post('/subjects/:id/topic-tree/confirm', async (request) => {
    const { id } = SubjectIdParamsSchema.parse(request.params);
    const tree = await confirmSubjectTopics(request.user!.id, id, {});
    return { success: true, message: 'Topic tree confirmed', tree };
  });

  fastify.patch('/topics/:id', async (request) => {
    const { id } = TopicIdParamsSchema.parse(request.params);
    const body = UpdateTopicSchema.parse(request.body ?? {});
    return updateTopic(request.user!.id, id, body);
  });
}
