import jwt from 'jsonwebtoken';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import supertest from 'supertest';
import { config } from '../src/config.js';

vi.mock('../src/lib/prisma.js', () => ({
  prisma: {
    subject: {
      findFirst: vi.fn(),
    },
    topic: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
    $disconnect: vi.fn(),
  },
}));

import { prisma } from '../src/lib/prisma.js';
import { buildApp } from '../src/app.js';

const baseSubject = {
  id: 'subject_1',
  userId: 'user_1',
  title: 'Biology',
  description: null,
  examDate: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  documents: [{ sourceType: 'syllabus' }],
};

const topicRows = [
  {
    id: 'unit_1',
    subjectId: 'subject_1',
    parentId: null,
    title: 'Unit 1',
    level: 'unit',
    order: 0,
    status: 'not_started',
    sourceSpans: [{ page: 1, start: 1, end: 10 }],
    confirmed: false,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  },
  {
    id: 'chapter_1',
    subjectId: 'subject_1',
    parentId: 'unit_1',
    title: 'Cell Biology',
    level: 'chapter',
    order: 0,
    status: 'studied',
    sourceSpans: [{ page: 1, start: 1, end: 5 }],
    confirmed: false,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  },
  {
    id: 'concept_1',
    subjectId: 'subject_1',
    parentId: 'chapter_1',
    title: 'Cell structure',
    level: 'concept',
    order: 0,
    status: 'not_started',
    sourceSpans: [{ page: 1, start: 2, end: 3 }],
    confirmed: false,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  },
];

function authHeader(userId = 'user_1', email = 'student@example.com') {
  return `Bearer ${jwt.sign({ sub: userId, email, type: 'access' }, config.JWT_SECRET)}`;
}

describe('topic tree endpoints', () => {
  let app: Awaited<ReturnType<typeof buildApp>> | undefined;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = await buildApp();
    await app.ready();
  });

  afterEach(async () => {
    await app?.close();
  });

  it('returns the subject topic tree with nested units, chapters and concepts', async () => {
    vi.mocked(prisma.subject.findFirst).mockResolvedValue(baseSubject as any);
    vi.mocked(prisma.topic.findMany).mockResolvedValue(topicRows as any);

    const response = await supertest(app!.server)
      .get('/api/v1/subjects/subject_1/topics')
      .set('authorization', authHeader());

    expect(response.status).toBe(200);
    expect(response.body.subject_title).toBe('Biology');
    expect(response.body.source_type).toBe('syllabus');
    expect(response.body.units[0].chapters[0].concepts[0].title).toBe('Cell structure');
  });

  it('updates an owned topic and accepts status updates', async () => {
    vi.mocked(prisma.topic.findFirst).mockResolvedValue({
      id: 'chapter_1',
      subjectId: 'subject_1',
      parentId: 'unit_1',
      title: 'Cell Biology',
      level: 'chapter',
      status: 'studied',
      userId: 'user_1',
      subject: { userId: 'user_1' },
    } as any);
    vi.mocked(prisma.topic.update).mockResolvedValue({
      id: 'chapter_1',
      subjectId: 'subject_1',
      parentId: 'unit_1',
      title: 'Cell Biology',
      level: 'chapter',
      status: 'revised',
      order: 0,
    } as any);

    const response = await supertest(app!.server)
      .patch('/api/v1/topics/chapter_1')
      .set('authorization', authHeader())
      .send({ status: 'revised' });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('revised');
  });

  it('requires user ownership for topic changes', async () => {
    vi.mocked(prisma.topic.findFirst).mockResolvedValue(null);

    const response = await supertest(app!.server)
      .patch('/api/v1/topics/other_topic')
      .set('authorization', authHeader())
      .send({ title: 'Updated' });

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it('confirms all topics for a subject', async () => {
    vi.mocked(prisma.subject.findFirst).mockResolvedValue(baseSubject as any);
    vi.mocked(prisma.topic.updateMany).mockResolvedValue({ count: 3 } as any);
    vi.mocked(prisma.topic.findMany).mockResolvedValue(topicRows as any);

    const response = await supertest(app!.server)
      .post('/api/v1/subjects/subject_1/topics/confirm')
      .set('authorization', authHeader())
      .send({ confirmed: true });

    expect(response.status).toBe(200);
    expect(response.body.units[0].chapters[0].concepts[0].title).toBe('Cell structure');
  });
});
