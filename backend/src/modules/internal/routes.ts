import type { FastifyInstance } from 'fastify';
import { AppError } from '@/lib/errors.js';
import { canonicalJsonPayload, verifySignature } from '@/lib/hmac.js';
import { AgentCallbackSchema } from '@/modules/jobs/schemas.js';
import { finalizeJobFromCallback } from '@/modules/jobs/service.js';

export default async function internalRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post('/agents/callback', async (request, reply) => {
    const signature = request.headers['x-signature'];
    const payload = request.body as Record<string, unknown>;
    const serialized = canonicalJsonPayload(payload ?? {});

    if (!verifySignature(serialized, signature)) {
      throw new AppError(401, 'INVALID_SIGNATURE', 'Invalid callback signature');
    }

    const callback = AgentCallbackSchema.parse(payload);
    const result = await finalizeJobFromCallback(callback);

    return reply.status(200).send({
      ok: true,
      idempotent: result.idempotent,
      job: { id: result.id, status: result.status },
    });
  });
}
