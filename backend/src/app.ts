import { randomUUID } from 'node:crypto';
import Fastify, { type FastifyInstance } from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import jwt from 'jsonwebtoken';
import { ZodError } from 'zod';
import { config } from '@/config.js';
import { AppError } from '@/lib/errors.js';
import { prisma } from '@/lib/prisma.js';
import { closeQueue } from '@/lib/queue.js';
import authPlugin from '@/plugins/auth.js';
import authRoutes from '@/modules/auth/routes.js';
import subjectRoutes from '@/modules/subjects/routes.js';
import documentRoutes from '@/modules/documents/routes.js';
import jobRoutes from '@/modules/jobs/routes.js';
import internalRoutes from '@/modules/internal/routes.js';
import topicRoutes from '@/modules/topics/routes.js';
import noteRoutes from '@/modules/notes/routes.js';
import artifactRoutes from '@/modules/artifacts/routes.js';
import quizRoutes from '@/modules/quizzes/routes.js';
import progressRoutes from '@/modules/progress/routes.js';
import chatRoutes from '@/modules/chat/routes.js';
import userRoutes from '@/modules/users/routes.js';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: config.NODE_ENV === 'test' ? false : {
      level: config.LOG_LEVEL,
      ...(config.NODE_ENV === 'development'
        ? { transport: { target: 'pino-pretty', options: { colorize: true } } }
        : {}),
    },
    genReqId: () => randomUUID(),
  });

  await app.register(helmet);
  await app.register(cors, {
    origin: config.CORS_ORIGIN.split(',').map((origin) => origin.trim()),
    credentials: true,
  });
  await app.register(cookie);
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    keyGenerator: (request) => {
      const authorization = request.headers.authorization;
      if (authorization?.startsWith('Bearer ')) {
        try {
          const payload = jwt.verify(authorization.slice(7), config.JWT_SECRET);
          if (typeof payload !== 'string' && payload.type === 'access' && payload.sub) {
            return `user:${payload.sub}`;
          }
        } catch {
          return `ip:${request.ip}`;
        }
      }
      return `ip:${request.ip}`;
    },
  });
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'Student Life OS API',
        description: 'Student Life OS backend API',
        version: '1.0.0',
      },
      servers: [{ url: '/api/v1' }],
    },
  });
  await app.register(swaggerUi, { routePrefix: '/docs' });
  await app.register(authPlugin);

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      if (error.statusCode >= 500) {
        request.log.error({ err: error, code: error.code }, error.message);
      }
      return reply.status(error.statusCode).send({
        error: { code: error.code, message: error.message },
      });
    }
    if (error instanceof ZodError) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'Request validation failed' },
      });
    }

    request.log.error({ err: error }, 'Unhandled request error');
    return reply.status(500).send({
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred' },
    });
  });

  app.get('/health', async () => ({ status: 'ok' }));
  app.get('/api/v1/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));
  await app.register(authRoutes, { prefix: '/api/v1/auth' });
  await app.register(subjectRoutes, { prefix: '/api/v1/subjects' });
  await app.register(documentRoutes, { prefix: '/api/v1/documents' });
  await app.register(topicRoutes, { prefix: '/api/v1' });
  await app.register(noteRoutes, { prefix: '/api/v1' });
  await app.register(artifactRoutes, { prefix: '/api/v1' });
  await app.register(quizRoutes, { prefix: '/api/v1' });
  await app.register(progressRoutes, { prefix: '/api/v1' });
  await app.register(chatRoutes, { prefix: '/api/v1' });
  await app.register(userRoutes, { prefix: '/api/v1' });
  await app.register(jobRoutes, { prefix: '/api/v1/jobs' });
  await app.register(internalRoutes, { prefix: '/api/v1/internal' });

  app.addHook('onClose', async () => {
    try {
      await closeQueue();
    } finally {
      await prisma.$disconnect();
    }
  });

  return app;
}
