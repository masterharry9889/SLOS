import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import supertest from 'supertest';

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
    $transaction: vi.fn(),
    $disconnect: vi.fn(),
  },
}));

import { prisma } from '../src/lib/prisma.js';
import { buildApp } from '../src/app.js';

const testUser = {
  id: 'user_test_1',
  email: 'student@example.com',
  name: 'Student',
  passwordHash: null as string | null,
  avatarUrl: null,
  googleId: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  deletedAt: null,
};

const prismaMock = vi.mocked(prisma);

describe('authentication API', () => {
  let app: Awaited<ReturnType<typeof buildApp>> | undefined;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = await buildApp();
    await app.ready();
    vi.mocked(prismaMock.refreshToken.create).mockResolvedValue({
      id: 'refresh_test_1',
      userId: testUser.id,
      tokenHash: 'stored-hash',
      expiresAt: new Date(Date.now() + 60_000),
      createdAt: new Date(),
    });
  });

  afterEach(async () => {
    await app?.close();
  });

  it('registers a user without returning password data and sets a refresh cookie', async () => {
    vi.mocked(prismaMock.user.create).mockImplementation(async ({ data }) => ({
      ...testUser,
      email: data.email,
      name: data.name,
      passwordHash: data.passwordHash ?? null,
    }));

    const response = await supertest(app!.server)
      .post('/api/v1/auth/register')
      .send({ email: ' Student@Example.com ', password: 'a-secure-password', name: 'Student' });

    expect(response.status).toBe(201);
    expect(response.body.user).toMatchObject({ email: 'student@example.com', name: 'Student' });
    expect(response.body.user.passwordHash).toBeUndefined();
    expect(response.body.accessToken).toEqual(expect.any(String));
    expect(response.headers['set-cookie'][0]).toContain('HttpOnly');
    expect(prismaMock.refreshToken.create).toHaveBeenCalledOnce();
  });

  it('rejects invalid credentials without distinguishing an unknown email', async () => {
    vi.mocked(prismaMock.user.findFirst).mockResolvedValue(null);

    const response = await supertest(app!.server)
      .post('/api/v1/auth/login')
      .send({ email: testUser.email, password: 'incorrect-password' });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('returns a consistent validation error for invalid registration input', async () => {
    const response = await supertest(app!.server)
      .post('/api/v1/auth/register')
      .send({ email: 'not-an-email', password: 'short', name: '' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: { code: 'VALIDATION_ERROR', message: 'Request validation failed' },
    });
  });

  it('requires an access token for /me and returns the signed-in user', async () => {
    const missingToken = await supertest(app!.server).get('/api/v1/auth/me');
    expect(missingToken.status).toBe(401);

    vi.mocked(prismaMock.user.create).mockImplementation(async ({ data }) => ({
      ...testUser,
      email: data.email,
      name: data.name,
      passwordHash: data.passwordHash ?? null,
    }));
    const registration = await supertest(app!.server)
      .post('/api/v1/auth/register')
      .send({ email: testUser.email, password: 'a-secure-password', name: 'Student' });
    vi.mocked(prismaMock.user.findFirst).mockResolvedValue(testUser);

    const me = await supertest(app!.server)
      .get('/api/v1/auth/me')
      .set('authorization', `Bearer ${registration.body.accessToken}`);

    expect(me.status).toBe(200);
    expect(me.body.user).toMatchObject({ id: testUser.id, email: testUser.email });
  });

  it('rejects a Google callback with an invalid state parameter', async () => {
    const response = await supertest(app!.server)
      .get('/api/v1/auth/google/callback?code=example&state=invalid');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_OAUTH_STATE');
  });
});
