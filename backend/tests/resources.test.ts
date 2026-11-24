import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import supertest from 'supertest';
import jwt from 'jsonwebtoken';

vi.mock('../src/lib/prisma.js', () => ({
  prisma: {
    user: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    refreshToken: {
      create: vi.fn(),
      findUnique: vi.fn(),
      deleteMany: vi.fn(),
    },
    subject: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    document: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    job: {
      create: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
    $disconnect: vi.fn(),
  },
}));

vi.mock('../src/lib/storage.js', () => ({
  createUploadUrl: vi.fn(),
  createDownloadUrl: vi.fn(),
  getObjectMetadata: vi.fn(),
  getObjectPrefix: vi.fn(),
  deleteObject: vi.fn(),
}));

vi.mock('../src/lib/queue.js', () => ({
  enqueueJob: vi.fn(),
  closeQueue: vi.fn(),
}));

import { prisma } from '../src/lib/prisma.js';
import {
  createUploadUrl,
  createDownloadUrl,
  getObjectMetadata,
  getObjectPrefix,
} from '../src/lib/storage.js';
import { enqueueJob } from '../src/lib/queue.js';
import { buildApp } from '../src/app.js';

const prismaMock = vi.mocked(prisma);
const ownerId = 'user_owner';
const subjectId = 'subject_owned';
const bearer = `Bearer ${jwt.sign(
  { email: 'owner@example.com', type: 'access' },
  process.env.JWT_SECRET!,
  { subject: ownerId, expiresIn: '1h' },
)}`;

describe('subjects, document upload, and storage routes', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = await buildApp();
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it('scopes subject reads to the authenticated user', async () => {
    vi.mocked(prismaMock.subject.findFirst).mockResolvedValue(null);

    const response = await supertest(app.server)
      .get(`/api/v1/subjects/${subjectId}`)
      .set('authorization', bearer);

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
    expect(prismaMock.subject.findFirst).toHaveBeenCalledWith({
      where: { id: subjectId, userId: ownerId },
    });
  });

  it('creates a subject for the authenticated user', async () => {
    const subject = {
      id: subjectId,
      userId: ownerId,
      title: 'Biology',
      description: null,
      examDate: null,
    };
    vi.mocked(prismaMock.subject.create).mockResolvedValue(subject as never);

    const response = await supertest(app.server)
      .post('/api/v1/subjects')
      .set('authorization', bearer)
      .send({ title: 'Biology' });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ id: subjectId, title: 'Biology' });
    expect(prismaMock.subject.create).toHaveBeenCalledWith({
      data: {
        userId: ownerId,
        title: 'Biology',
        description: null,
        examDate: null,
      },
    });
  });

  it('does not issue upload URLs for another user’s subject', async () => {
    vi.mocked(prismaMock.subject.findFirst).mockResolvedValue(null);

    const response = await supertest(app.server)
      .post('/api/v1/documents/upload-url')
      .set('authorization', bearer)
      .send({
        subjectId,
        fileName: 'course.pdf',
        fileSize: 1_024,
        mimeType: 'application/pdf',
      });

    expect(response.status).toBe(404);
    expect(createUploadUrl).not.toHaveBeenCalled();
  });

  it('creates a presigned upload URL for a supported document and owned subject', async () => {
    vi.mocked(prismaMock.subject.findFirst).mockResolvedValue({ id: subjectId } as never);
    vi.mocked(createUploadUrl).mockResolvedValue('https://minio.example/upload');

    const response = await supertest(app.server)
      .post('/api/v1/documents/upload-url')
      .set('authorization', bearer)
      .send({
        subjectId,
        fileName: 'course.pdf',
        fileSize: 1_024,
        mimeType: 'application/pdf',
      });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      uploadUrl: 'https://minio.example/upload',
      expiresIn: 900,
    });
    expect(response.body.fileKey).toMatch(
      new RegExp(`^${ownerId}/${subjectId}/[0-9a-f-]+/course\\.pdf$`),
    );
    expect(createUploadUrl).toHaveBeenCalledWith(response.body.fileKey, 'application/pdf');
  });

  it('rejects unsupported types and oversized files before signing an upload', async () => {
    const unsupported = await supertest(app.server)
      .post('/api/v1/documents/upload-url')
      .set('authorization', bearer)
      .send({
        subjectId,
        fileName: 'course.txt',
        fileSize: 1_024,
        mimeType: 'text/plain',
      });
    expect(unsupported.status).toBe(400);

    const oversized = await supertest(app.server)
      .post('/api/v1/documents/upload-url')
      .set('authorization', bearer)
      .send({
        subjectId,
        fileName: 'course.pdf',
        fileSize: 25 * 1024 * 1024 + 1,
        mimeType: 'application/pdf',
      });
    expect(oversized.status).toBe(400);
    expect(createUploadUrl).not.toHaveBeenCalled();
  });

  it('rejects document registration when the object key is not owned by the user', async () => {
    const response = await supertest(app.server)
      .post('/api/v1/documents')
      .set('authorization', bearer)
      .send({
        subjectId,
        fileName: 'course.pdf',
        fileKey: `user_other/${subjectId}/c55d9e78-b377-4b14-b34d-15b3d2c11746/course.pdf`,
        fileSize: 1_024,
        mimeType: 'application/pdf',
        sourceType: 'syllabus',
      });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_FILE_KEY');
    expect(getObjectMetadata).not.toHaveBeenCalled();
  });

  it('registers a verified upload and enqueues its parse job', async () => {
    const fileKey = `${ownerId}/${subjectId}/c55d9e78-b377-4b14-b34d-15b3d2c11746/course.pdf`;
    const document = {
      id: 'document_1',
      userId: ownerId,
      subjectId,
      fileName: 'course.pdf',
      fileKey,
      fileSize: 8,
      mimeType: 'application/pdf',
      sourceType: 'syllabus',
      status: 'uploaded',
    };
    const job = {
      id: 'job_1',
      userId: ownerId,
      type: 'parse',
      status: 'queued',
      payload: {},
    };
    const transaction = {
      document: { create: vi.fn().mockResolvedValue(document) },
      job: { create: vi.fn().mockResolvedValue(job) },
    };
    vi.mocked(prismaMock.$transaction).mockImplementation(async (callback) => {
      if (typeof callback !== 'function') throw new Error('Expected transaction callback');
      return callback(transaction as never);
    });
    vi.mocked(prismaMock.subject.findFirst).mockResolvedValue({ id: subjectId } as never);
    vi.mocked(getObjectMetadata).mockResolvedValue({
      contentLength: 8,
      contentType: 'application/pdf',
    });
    vi.mocked(getObjectPrefix).mockResolvedValue(new TextEncoder().encode('%PDF-1.7'));

    const response = await supertest(app.server)
      .post('/api/v1/documents')
      .set('authorization', bearer)
      .send({
        subjectId,
        fileName: 'course.pdf',
        fileKey,
        fileSize: 8,
        mimeType: 'application/pdf',
        sourceType: 'syllabus',
      });

    expect(response.status).toBe(201);
    expect(response.body.document.id).toBe(document.id);
    expect(response.body.job.id).toBe(job.id);
    expect(enqueueJob).toHaveBeenCalledWith({
      jobId: job.id,
      userId: ownerId,
      type: 'parse',
      payload: {
        documentId: document.id,
        subjectId,
        fileKey,
        sourceType: 'syllabus',
      },
    });
  });

  it('rejects file content that does not match the declared MIME type', async () => {
    const fileKey = `${ownerId}/${subjectId}/c55d9e78-b377-4b14-b34d-15b3d2c11746/course.pdf`;
    vi.mocked(prismaMock.subject.findFirst).mockResolvedValue({ id: subjectId } as never);
    vi.mocked(getObjectMetadata).mockResolvedValue({
      contentLength: 8,
      contentType: 'application/pdf',
    });
    vi.mocked(getObjectPrefix).mockResolvedValue(new TextEncoder().encode('not a pdf'));

    const response = await supertest(app.server)
      .post('/api/v1/documents')
      .set('authorization', bearer)
      .send({
        subjectId,
        fileName: 'course.pdf',
        fileKey,
        fileSize: 8,
        mimeType: 'application/pdf',
        sourceType: 'syllabus',
      });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('FILE_CONTENT_MISMATCH');
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('does not expose documents owned by another user', async () => {
    vi.mocked(prismaMock.document.findFirst).mockResolvedValue(null);

    const response = await supertest(app.server)
      .get('/api/v1/documents/document_other')
      .set('authorization', bearer);

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
    expect(createDownloadUrl).not.toHaveBeenCalled();
  });

  it('scopes document reads and returns a presigned download URL', async () => {
    vi.mocked(prismaMock.document.findFirst).mockResolvedValue({
      id: 'document_1',
      userId: ownerId,
      fileKey: `${ownerId}/${subjectId}/c55d9e78-b377-4b14-b34d-15b3d2c11746/course.pdf`,
    } as never);
    vi.mocked(createDownloadUrl).mockResolvedValue('https://minio.example/download');

    const response = await supertest(app.server)
      .get('/api/v1/documents/document_1')
      .set('authorization', bearer);

    expect(response.status).toBe(200);
    expect(response.body.downloadUrl).toBe('https://minio.example/download');
    expect(prismaMock.document.findFirst).toHaveBeenCalledWith({
      where: { id: 'document_1', userId: ownerId },
    });
  });
});
