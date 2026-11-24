import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { subscribeToJob } from '@/lib/jobEvents.js';
import { JobIdParamsSchema } from './schemas.js';
import { getJobForUser } from './service.js';

export default async function jobRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('onRequest', fastify.authenticate);

  fastify.get('/:id', async (request) => {
    const { id } = JobIdParamsSchema.parse(request.params);
    return getJobForUser(request.user!.id, id);
  });

  const streamHandler = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = JobIdParamsSchema.parse(request.params);
    const job = await getJobForUser(request.user!.id, id);

    reply.raw.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    reply.raw.setHeader('Cache-Control', 'no-cache, no-transform');
    reply.raw.setHeader('Connection', 'keep-alive');
    reply.raw.setHeader('X-Accel-Buffering', 'no');

    const writeEvent = (payload: Record<string, unknown>) => {
      reply.raw.write(`data: ${JSON.stringify(payload)}\n\n`);
    };

    writeEvent({
      type: job.status === 'completed' ? 'job_completed' : job.status === 'failed' ? 'job_failed' : 'job_progress',
      jobId: job.id,
      status: job.status,
      progress: job.status === 'completed' ? 100 : 0,
      result: job.result,
      error: job.error,
    });

    const unsubscribe = subscribeToJob(id, ({ jobId, status, result, error }) => {
      writeEvent({
        type: status === 'completed' ? 'job_completed' : status === 'failed' ? 'job_failed' : 'job_progress',
        jobId,
        status,
        progress: status === 'completed' ? 100 : 0,
        result,
        error,
      });
    });

    request.raw.on('close', () => {
      unsubscribe();
      reply.raw.end();
    });
    request.raw.on('error', unsubscribe);

    reply.hijack();
    return reply;
  };
  fastify.get('/:id/stream', streamHandler);
  fastify.get('/:id/events', streamHandler);
}
