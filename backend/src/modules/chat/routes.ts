import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { config } from '@/config.js';
import { prisma } from '@/lib/prisma.js';
import { AppError } from '@/lib/errors.js';
import { getRuntimeLLMConfig } from '@/lib/llmSettings.js';

const ChatSchema = z.object({
  subject_id: z.string().min(1),
  chapter_id: z.string().optional(),
  agent_id: z.enum(['tutor', 'notes', 'cheatsheet', 'paper', 'assessment', 'verifier']).optional(),
  message: z.string().trim().min(1).max(10_000),
  level: z.enum(['simple', 'exam', 'advanced']).default('simple'),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().max(20_000),
  })).max(50).default([]),
});

export default async function chatRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('onRequest', fastify.authenticate);

  fastify.get('/chat/history', async (request) => {
    const query = z.object({
      subject_id: z.string().min(1),
      chapter_id: z.string().optional(),
    }).parse(request.query);
    const subject = await prisma.subject.findFirst({
      where: { id: query.subject_id, userId: request.user!.id },
      select: { id: true },
    });
    if (!subject) throw new AppError(404, 'NOT_FOUND', 'Subject not found');
    return prisma.chatMessage.findMany({
      where: {
        userId: request.user!.id,
        subjectId: subject.id,
        ...(query.chapter_id ? { topicId: query.chapter_id } : {}),
      },
      orderBy: { createdAt: 'asc' },
      take: 200,
    });
  });

  fastify.post('/chat/stream', {
    config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    const input = ChatSchema.parse(request.body);
    const subject = await prisma.subject.findFirst({
      where: { id: input.subject_id, userId: request.user!.id },
      select: { id: true, title: true },
    });
    if (!subject) throw new AppError(404, 'NOT_FOUND', 'Subject not found');
    if (input.chapter_id) {
      const chapter = await prisma.topic.findFirst({
        where: { id: input.chapter_id, subjectId: subject.id },
        select: { id: true },
      });
      if (!chapter) throw new AppError(404, 'NOT_FOUND', 'Chapter not found');
    }

    const notes = await prisma.note.findMany({
      where: {
        userId: request.user!.id,
        isLatest: true,
        topic: {
          subjectId: subject.id,
          ...(input.chapter_id ? { id: input.chapter_id } : {}),
        },
      },
      select: { content: true, topic: { select: { title: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    const userSettings = await prisma.user.findFirst({
      where: { id: request.user!.id, deletedAt: null },
      select: { settings: true },
    });

    await prisma.chatMessage.create({
      data: {
        userId: request.user!.id,
        subjectId: subject.id,
        topicId: input.chapter_id,
        role: 'user',
        content: input.message,
        metadata: { level: input.level },
      },
    });

    let response: Response;
    try {
      response = await fetch(`${config.AGENTS_SERVICE_URL}/v1/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Service-Key': config.AGENTS_SERVICE_API_KEY,
          Accept: 'text/event-stream',
        },
        body: JSON.stringify({
          ...input,
          subject_title: subject.title,
          subject_context: notes.map((note) => `# ${note.topic.title}\n${note.content}`).join('\n\n'),
          user_id: request.user!.id,
          llm: getRuntimeLLMConfig(userSettings?.settings),
        }),
        signal: AbortSignal.timeout(60_000),
      });
    } catch {
      throw new AppError(502, 'AGENTS_SERVICE_UNAVAILABLE', 'Chat service is temporarily unavailable');
    }
    if (!response.ok) {
      throw new AppError(502, 'AGENTS_SERVICE_ERROR', 'Chat service could not process the request');
    }
    if (!response.headers.get('content-type')?.includes('text/event-stream') || !response.body) {
      throw new AppError(503, 'CHAT_NOT_IMPLEMENTED', 'The agents-service chat stream is not implemented yet');
    }

    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    reply.hijack();
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffered = '';
    let assistantContent = '';
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        reply.raw.write(chunk);
        buffered += chunk;
        const events = buffered.split('\n\n');
        buffered = events.pop() ?? '';
        for (const event of events) {
          for (const line of event.split('\n')) {
            if (!line.startsWith('data:')) continue;
            try {
              const payload = JSON.parse(line.slice(5).trim()) as { type?: string; token?: string };
              if (payload.type === 'chat_token' && payload.token) assistantContent += payload.token;
            } catch {
              request.log.warn('Ignoring malformed chat SSE event from agents-service');
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
      if (assistantContent) {
        await prisma.chatMessage.create({
          data: {
            userId: request.user!.id,
            subjectId: subject.id,
            topicId: input.chapter_id,
            role: 'assistant',
            content: assistantContent,
            metadata: { level: input.level },
          },
        });
      }
      reply.raw.end();
    }
  });
}
