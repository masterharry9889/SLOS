import type { FastifyInstance } from 'fastify';
import { CreateQuizSchema, QuizParamsSchema } from './schemas.js';
import { createQuiz, getQuiz, listQuizzes, startAttempt } from './service.js';
import { AttemptAnswersSchema } from './schemas.js';
import { getAttemptResult, submitAttempt } from '@/modules/attempts/service.js';

export default async function quizRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('onRequest', fastify.authenticate);
  fastify.post('/quizzes', async (request, reply) => reply.status(201).send(
    await createQuiz(request.user!.id, CreateQuizSchema.parse(request.body)),
  ));
  fastify.get('/subjects/:subjectId/quizzes', async (request) => {
    const { subjectId } = request.params as { subjectId: string };
    return listQuizzes(request.user!.id, subjectId);
  });
  fastify.get('/quizzes/:quizId', async (request) => {
    const { quizId } = QuizParamsSchema.parse(request.params);
    return getQuiz(request.user!.id, quizId);
  });
  fastify.post('/quizzes/:quizId/start', async (request) => {
    const { quizId } = QuizParamsSchema.parse(request.params);
    return startAttempt(request.user!.id, quizId);
  });
  fastify.post('/quizzes/:quizId/attempts/:attemptId/submit', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    const { quizId } = QuizParamsSchema.parse(request.params);
    const { attemptId } = request.params as { attemptId: string };
    const quiz = await getQuiz(request.user!.id, quizId);
    const body = AttemptAnswersSchema.parse(request.body);
    const result = await submitAttempt(request.user!.id, attemptId, body.answers);
    if (!quiz) return reply.status(404).send();
    return reply.status(202).send(result);
  });
  fastify.get('/quizzes/:quizId/attempts/:attemptId/result', async (request) => {
    const { attemptId } = request.params as { attemptId: string };
    return getAttemptResult(request.user!.id, attemptId);
  });
}
