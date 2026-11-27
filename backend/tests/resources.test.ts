import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import supertest from 'supertest';
import jwt from 'jsonwebtoken';
import { getRuntimeLLMConfig } from '../src/lib/llmSettings.js';

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
    vi.unstubAllGlobals();
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

  it('verifies and encrypts provider credentials without returning them', async () => {
    vi.mocked(prismaMock.user.findFirst).mockResolvedValue({ settings: {} } as never);
    vi.mocked(prismaMock.user.update).mockResolvedValue({} as never);
    const fetchMock = vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ choices: [{ message: { content: 'OK' } }] }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    ));
    vi.stubGlobal('fetch', fetchMock);

    const response = await supertest(app.server)
      .post('/api/v1/settings/llm/providers')
      .set('authorization', bearer)
      .send({
        providerId: 'openai',
        apiKey: 'secret-provider-key',
        model: 'gpt-4o-mini',
      });

    expect(response.status).toBe(200);
    expect(response.body.llm.activeProviderId).toBe('openai');
    expect(response.body.llm.providers.openai).toMatchObject({
      model: 'gpt-4o-mini',
      configured: true,
    });
    expect(JSON.stringify(response.body)).not.toContain('secret-provider-key');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.openai.com/v1/chat/completions',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer secret-provider-key' }),
      }),
    );
    expect(prismaMock.user.update).toHaveBeenCalledWith(expect.objectContaining({
      data: {
        settings: expect.objectContaining({
          llm: expect.objectContaining({
            providers: expect.objectContaining({
              openai: expect.objectContaining({
                encryptedApiKey: expect.any(String),
              }),
            }),
          }),
        }),
      },
    }));
    const storedSettings = vi.mocked(prismaMock.user.update).mock.calls[0][0].data.settings;
    expect(getRuntimeLLMConfig(storedSettings)?.api_key).toBe('secret-provider-key');

    vi.mocked(prismaMock.user.findFirst).mockResolvedValue({
      settings: storedSettings,
    } as never);
    const getResponse = await supertest(app.server)
      .get('/api/v1/settings')
      .set('authorization', bearer);
    expect(getResponse.status).toBe(200);
    expect(JSON.stringify(getResponse.body)).not.toContain('encryptedApiKey');
  });

  it('rejects Local provider URLs that could access private services', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    vi.mocked(prismaMock.user.findFirst).mockResolvedValue({ settings: {} } as never);

    const response = await supertest(app.server)
      .post('/api/v1/settings/llm/providers')
      .set('authorization', bearer)
      .send({
        providerId: 'local',
        model: 'llama3.2',
        baseUrl: 'http://169.254.169.254/v1',
      });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_LOCAL_ENDPOINT');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it('accepts a custom HTTPS Local endpoint and appends the completion path only when needed', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ choices: [{ message: { content: 'OK' } }] }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    ));
    vi.stubGlobal('fetch', fetchMock);
    vi.mocked(prismaMock.user.findFirst).mockResolvedValue({ settings: {} } as never);
    vi.mocked(prismaMock.user.update).mockResolvedValue({} as never);

    const response = await supertest(app.server)
      .post('/api/v1/settings/llm/providers')
      .set('authorization', bearer)
      .send({
        providerId: 'local',
        model: 'custom-model',
        baseUrl: 'https://8.8.8.8/custom/v1/chat/completions/',
      });

    expect(response.status, response.text).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://8.8.8.8/custom/v1/chat/completions',
      expect.any(Object),
    );
    expect(prismaMock.user.update).toHaveBeenCalledWith(expect.objectContaining({
      data: {
        settings: expect.objectContaining({
          llm: expect.objectContaining({
            providers: expect.objectContaining({
              local: expect.objectContaining({
                baseUrl: 'https://8.8.8.8/custom/v1/chat/completions',
              }),
            }),
          }),
        }),
      },
    }));
  });

  it('does not save provider credentials when the provider rejects verification', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 401 })));
    vi.mocked(prismaMock.user.findFirst).mockResolvedValue({ settings: {} } as never);

    const response = await supertest(app.server)
      .post('/api/v1/settings/llm/providers')
      .set('authorization', bearer)
      .send({
        providerId: 'anthropic',
        apiKey: 'invalid-test-key',
        model: 'claude-test',
      });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('PROVIDER_VERIFICATION_FAILED');
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it('shows the provider reason when verification returns a structured error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ error: { message: 'The requested model is not available.' } }),
      { status: 400, headers: { 'content-type': 'application/json' } },
    )));
    vi.mocked(prismaMock.user.findFirst).mockResolvedValue({ settings: {} } as never);

    const response = await supertest(app.server)
      .post('/api/v1/settings/llm/providers')
      .set('authorization', bearer)
      .send({
        providerId: 'grok',
        apiKey: 'invalid-test-key',
        model: 'grok-test',
      });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toContain('The requested model is not available.');
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it('verifies Groq against its OpenAI-compatible API and saves the provider', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ choices: [{ message: { content: 'OK' } }] }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    ));
    vi.stubGlobal('fetch', fetchMock);
    vi.mocked(prismaMock.user.findFirst).mockResolvedValue({ settings: {} } as never);
    vi.mocked(prismaMock.user.update).mockResolvedValue({} as never);

    const response = await supertest(app.server)
      .post('/api/v1/settings/llm/providers')
      .set('authorization', bearer)
      .send({
        providerId: 'groq',
        apiKey: 'groq-test-key',
        model: 'llama-3.3-70b-versatile',
      });

    expect(response.status, response.text).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.groq.com/openai/v1/chat/completions',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer groq-test-key' }),
      }),
    );
    expect(prismaMock.user.update).toHaveBeenCalledWith(expect.objectContaining({
      data: {
        settings: expect.objectContaining({
          llm: expect.objectContaining({
            providers: expect.objectContaining({
              groq: expect.objectContaining({ model: 'llama-3.3-70b-versatile' }),
            }),
          }),
        }),
      },
    }));
  });
});
