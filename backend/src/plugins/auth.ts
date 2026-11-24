import { randomUUID } from 'node:crypto';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { config } from '@/config.js';

interface AccessTokenPayload extends JwtPayload {
  email: string;
  type: 'access';
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }

  interface FastifyRequest {
    user: { id: string; email: string } | null;
  }
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const payload = jwt.verify(token, config.JWT_SECRET);
  if (
    typeof payload === 'string' ||
    typeof payload.sub !== 'string' ||
    typeof payload.email !== 'string' ||
    payload.type !== 'access'
  ) {
    throw new Error('Invalid access token');
  }

  return payload as AccessTokenPayload;
}

async function authPlugin(fastify: FastifyInstance): Promise<void> {
  fastify.decorateRequest('user', null);

  fastify.decorate('authenticate', async (request, reply) => {
    const authorization = request.headers.authorization;
    const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : undefined;

    if (!token) {
      return reply.status(401).send({
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    try {
      const payload = verifyAccessToken(token);
      request.user = { id: payload.sub!, email: payload.email };
    } catch {
      return reply.status(401).send({
        error: { code: 'UNAUTHORIZED', message: 'Invalid or expired access token' },
      });
    }
  });
}

export default fp(authPlugin);
