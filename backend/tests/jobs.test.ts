import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import supertest from 'supertest';
import { canonicalJsonPayload, signPayload } from '../src/lib/hmac.js';

vi.mock('../src/lib/prisma.js', () => ({
  prisma: {
    job: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    document: {
      updateMany: vi.fn(),
    },
    $transaction: vi.fn(),
    $disconnect: vi.fn(),
  },
}));

import { prisma } from '../src/lib/prisma.js';
import { buildApp } from '../src/app.js';

const jobRecord = {
  id: 'job_123',
  userId: 'user_42',
  type: 'parse',
  status: 'queued',
  payload: { documentId: 'doc_123', subjectId: 'sub_1' },
  result: null,
  error: null,
  resourceId: 'doc_123',
  resourceType: 'document',
  attempts: 0,
  maxAttempts: 3,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  completedAt: null,
};

describe('agents callback handling', () => {
  let app: Awaited<ReturnType<typeof buildApp>> | undefined;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = await buildApp();
    await app.ready();
  });

  afterEach(async () => {
    await app?.close();
  });

  it('verifies the callback signature and stores a completed job result', async () => {
    const payload = {
      job_id: 'job_123',
      status: 'completed',
      result: {
        document_id: 'doc_123',
        topicTree: {
          subject_title: 'Biology',
          units: [{ title: 'Unit 1', chapters: [{ title: 'Cell Biology', concepts: [] }] }],
        },
      },
    };

    vi.mocked(prisma.job.findUnique).mockResolvedValue(jobRecord);
    vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
      return await callback({
        job: {
            updateMany: vi.fn().mockResolvedValue({ count: 1 }),
            findUniqueOrThrow: vi.fn().mockResolvedValue({
              ...jobRecord,
              status: 'completed',
              result: payload.result,
              completedAt: new Date('2026-01-01T00:00:01Z'),
            }),
          },
          document: {
            findFirst: vi.fn().mockResolvedValue({ id: 'doc_123', subjectId: 'sub_1' }),
            update: vi.fn().mockResolvedValue({}),
          },
          topic: {
            create: vi.fn()
              .mockResolvedValueOnce({ id: 'unit_1' })
              .mockResolvedValueOnce({ id: 'chapter_1' }),
          },
        });
    });

    const response = await supertest(app!.server)
      .post('/api/v1/internal/agents/callback')
      .set('x-signature', signPayload(canonicalJsonPayload(payload)))
      .send(payload);

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.idempotent).toBe(false);
    expect(response.body.job.status).toBe('completed');
  });

  it('treats repeated callback submissions as idempotent', async () => {
    const payload = {
      job_id: 'job_123',
      status: 'failed',
      error: 'Processing failed',
    };

    vi.mocked(prisma.job.findUnique).mockResolvedValue({
      ...jobRecord,
      status: 'failed',
      error: 'Processing failed',
      completedAt: new Date('2026-01-01T00:00:02Z'),
    });

    const response = await supertest(app!.server)
      .post('/api/v1/internal/agents/callback')
      .set('x-signature', signPayload(canonicalJsonPayload(payload)))
      .send(payload);

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.idempotent).toBe(true);
    expect(response.body.job.status).toBe('failed');
  });
});
