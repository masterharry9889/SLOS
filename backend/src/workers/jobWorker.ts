import { randomUUID } from 'node:crypto';
import Redis from 'ioredis';
import { Queue, Worker } from 'bullmq';
import { config } from '@/config.js';
import { prisma } from '@/lib/prisma.js';
import { emitJobUpdate } from '@/lib/jobEvents.js';
import { createDownloadUrl } from '@/lib/storage.js';
import { getRuntimeLLMConfig } from '@/lib/llmSettings.js';

const JOB_QUEUE_NAME = 'slos-jobs';
const DEAD_LETTER_QUEUE_NAME = 'slos-jobs-dead-letter';
const AGENTS_ENDPOINTS: Record<string, string> = {
  parse: '/v1/ingest/parse',
  generate_notes: '/v1/notes/generate',
  generate_cheatsheet: '/v1/cheatsheets/generate',
  generate_paper: '/v1/papers/generate',
  evaluate: '/v1/assessments/evaluate',
};

const connection = new Redis(config.REDIS_URL, { maxRetriesPerRequest: null });
const deadLetterQueue = new Queue(DEAD_LETTER_QUEUE_NAME, { connection });

async function buildAgentPayload(
  jobId: string,
  userId: string,
  type: string,
  payload: Record<string, unknown>,
  callbackUrl: string,
) {
  const body: Record<string, unknown> = { ...payload, job_id: jobId, callback_url: callbackUrl };
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: { settings: true },
  });
  const llm = getRuntimeLLMConfig(user?.settings);
  if (llm) body.llm = llm;

  if (type === 'parse') {
    const documentId = String(payload.documentId ?? '');
    const document = await prisma.document.findFirst({
      where: { id: documentId },
      include: { subject: { select: { title: true } } },
    });
    if (!document) throw new Error('Document for parse job was not found');
    await prisma.document.update({ where: { id: document.id }, data: { status: 'parsing' } });
    body.document_id = document.id;
    body.document_url = await createDownloadUrl(document.fileKey);
    body.file_name = document.fileName;
    body.subject_title = document.subject.title;
    body.source_type = document.sourceType;
  } else if (type === 'generate_cheatsheet') {
    const subjectId = String(payload.subject_id ?? '');
    const scope = String(payload.scope ?? '');
    const scopeId = String(payload.scope_id ?? '');
    const topics = await prisma.topic.findMany({
      where: {
        subjectId,
        level: 'chapter',
        ...(scope === 'chapter' ? { id: scopeId } : scope === 'unit' ? { parentId: scopeId } : {}),
      },
      include: { notes: { where: { isLatest: true }, select: { content: true }, take: 1 } },
      orderBy: { order: 'asc' },
    });
    if (scope !== 'subject' && !topics.length) throw new Error('No chapter notes found for the requested scope');
    body.scope_title = scope === 'subject'
      ? 'Subject'
      : (await prisma.topic.findUnique({ where: { id: scopeId }, select: { title: true } }))?.title ?? scope;
    body.notes = topics.flatMap((topic) => topic.notes.map((note) => `${topic.title}\n${note.content}`)).join('\n\n');
  } else if (type === 'generate_paper') {
    const chapterIds = payload.chapter_ids as string[];
    const chapters = await prisma.topic.findMany({
      where: { id: { in: chapterIds }, subjectId: String(payload.subject_id), level: 'chapter' },
      select: { id: true, title: true },
    });
    if (chapters.length !== chapterIds.length) throw new Error('One or more paper chapters were not found');
    body.chapters = chapters.map((chapter) => `${chapter.id}: ${chapter.title}`);
    body.duration_min = payload.duration_minutes;
    body.difficulty_mix = payload.difficulty_mix;
    body.question_types = payload.question_types;
  }

  return body;
}

export const worker = new Worker(
  JOB_QUEUE_NAME,
  async (job) => {
    const jobId = String(job.data.jobId ?? job.id ?? randomUUID());
    const callbackUrl = `${config.BACKEND_URL}/api/v1/internal/agents/callback`;
    const endpoint = AGENTS_ENDPOINTS[job.data.type as string] ?? '/v1/health';

    await prisma.job.update({
      where: { id: jobId },
      data: { status: 'processing', updatedAt: new Date() },
    });

    const payload = await buildAgentPayload(
      jobId,
      String(job.data.userId),
      String(job.data.type),
      job.data.payload ?? {},
      callbackUrl,
    );
    const response = await fetch(`${config.AGENTS_SERVICE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Key': config.AGENTS_SERVICE_API_KEY,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      const message = await response.text().catch(() => 'Agent service request failed');
      throw new Error(message);
    }

    const responseData = await response.json() as { job_id?: string; status?: string };
    if (responseData.job_id !== jobId || responseData.status !== 'accepted') {
      throw new Error('Agents-service did not accept the asynchronous job');
    }
    return responseData;
  },
  { connection, concurrency: 1 },
);

worker.on('failed', async (job, error) => {
  if (!job || job.attemptsMade < Number(job.opts.attempts ?? 1)) return;
  const jobId = String(job.data.jobId ?? job.id ?? 'unknown');
  await prisma.job.updateMany({
    where: { id: jobId, status: { notIn: ['completed', 'failed'] } },
    data: { status: 'failed', error: error.message, completedAt: new Date() },
  });
  if (job.data.type === 'parse') {
    await prisma.document.updateMany({
      where: { id: String(job.data.payload?.documentId ?? '') },
      data: { status: 'error' },
    });
  }
  await deadLetterQueue.add('failed-job', {
    jobId,
    userId: job.data.userId,
    type: job.data.type,
    payload: job.data.payload,
    error: error.message,
  }, { attempts: 1, removeOnComplete: 100, removeOnFail: 500 });
  emitJobUpdate(jobId, { jobId, status: 'failed', error: error.message });
});

process.on('SIGINT', async () => {
  await worker.close();
  await deadLetterQueue.close();
  await connection.quit();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await worker.close();
  await deadLetterQueue.close();
  await connection.quit();
  process.exit(0);
});
