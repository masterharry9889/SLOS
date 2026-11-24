import { randomBytes, timingSafeEqual } from 'node:crypto';
import type { FastifyInstance, FastifyReply } from 'fastify';
import { z } from 'zod';
import { config } from '@/config.js';
import { AppError } from '@/lib/errors.js';
import {
  getCurrentUser,
  login,
  logout,
  refresh,
  register,
  signInWithGoogle,
  type AuthSession,
} from './service.js';
import { GoogleCallbackQuerySchema, LoginSchema, RegisterSchema } from './schemas.js';

const REFRESH_COOKIE = 'slos_refresh';
const GOOGLE_STATE_COOKIE = 'slos_google_state';
const GOOGLE_USERINFO_SCHEMA = z.object({
  sub: z.string().min(1),
  email: z.email(),
  email_verified: z.boolean(),
  name: z.string().min(1),
  picture: z.url().nullable().optional(),
});

function cookieOptions() {
  return {
    httpOnly: true,
    secure: config.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/api/v1/auth',
  };
}

function sendSession(reply: FastifyReply, session: AuthSession) {
  reply.setCookie(REFRESH_COOKIE, session.refreshToken, {
    ...cookieOptions(),
    maxAge: config.JWT_REFRESH_EXPIRES_IN,
  });
  return { user: session.user, accessToken: session.accessToken };
}

function setRefreshCookie(reply: FastifyReply, token: string) {
  reply.setCookie(REFRESH_COOKIE, token, {
    ...cookieOptions(),
    maxAge: config.JWT_REFRESH_EXPIRES_IN,
  });
}

function clearRefreshCookie(reply: FastifyReply) {
  reply.clearCookie(REFRESH_COOKIE, cookieOptions());
}

function googleStateMatches(received: string, expected: string | undefined): boolean {
  if (!expected) return false;
  const receivedBytes = Buffer.from(received);
  const expectedBytes = Buffer.from(expected);
  return (
    receivedBytes.length === expectedBytes.length &&
    timingSafeEqual(receivedBytes, expectedBytes)
  );
}

function requireGoogleConfig(): { clientId: string; clientSecret: string } {
  if (!config.GOOGLE_CLIENT_ID || !config.GOOGLE_CLIENT_SECRET) {
    throw new AppError(503, 'GOOGLE_OAUTH_UNAVAILABLE', 'Google sign-in is not configured');
  }
  return {
    clientId: config.GOOGLE_CLIENT_ID,
    clientSecret: config.GOOGLE_CLIENT_SECRET,
  };
}

async function exchangeGoogleCode(code: string) {
  const { clientId, clientSecret } = requireGoogleConfig();
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: config.GOOGLE_CALLBACK_URL,
      grant_type: 'authorization_code',
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!tokenResponse.ok) {
    throw new AppError(401, 'GOOGLE_AUTH_FAILED', 'Google authorization could not be completed');
  }

  const tokens = z.object({ access_token: z.string().min(1) }).parse(await tokenResponse.json());
  const profileResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { authorization: `Bearer ${tokens.access_token}` },
    signal: AbortSignal.timeout(10_000),
  });

  if (!profileResponse.ok) {
    throw new AppError(401, 'GOOGLE_AUTH_FAILED', 'Google profile could not be retrieved');
  }

  const profile = GOOGLE_USERINFO_SCHEMA.parse(await profileResponse.json());
  if (!profile.email_verified) {
    throw new AppError(401, 'GOOGLE_EMAIL_UNVERIFIED', 'Google account email is not verified');
  }

  return {
    googleId: profile.sub,
    email: profile.email.trim().toLowerCase(),
    name: profile.name,
    avatarUrl: profile.picture ?? null,
  };
}

export default async function authRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post('/register', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    const input = RegisterSchema.parse(request.body);
    const session = await register(input);
    return reply.status(201).send(sendSession(reply, session));
  });

  fastify.post('/login', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    const input = LoginSchema.parse(request.body);
    const session = await login(input);
    return sendSession(reply, session);
  });

  fastify.post('/refresh', async (request, reply) => {
    const session = await refresh(request.cookies[REFRESH_COOKIE] ?? '');
    setRefreshCookie(reply, session.refreshToken);
    return { user: session.user, accessToken: session.accessToken };
  });

  fastify.post('/logout', async (request, reply) => {
    await logout(request.cookies[REFRESH_COOKIE]);
    clearRefreshCookie(reply);
    return reply.status(204).send();
  });

  fastify.get('/me', { onRequest: [fastify.authenticate] }, async (request) => {
    return { user: await getCurrentUser(request.user!.id) };
  });

  fastify.get('/google', async (_request, reply) => {
    const { clientId } = requireGoogleConfig();
    const state = randomBytes(32).toString('base64url');
    reply.setCookie(GOOGLE_STATE_COOKIE, state, {
      ...cookieOptions(),
      path: '/api/v1/auth/google/callback',
      maxAge: 600,
    });

    const authorizationUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authorizationUrl.search = new URLSearchParams({
      client_id: clientId,
      redirect_uri: config.GOOGLE_CALLBACK_URL,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      prompt: 'select_account',
    }).toString();

    return reply.redirect(authorizationUrl.toString());
  });

  fastify.get('/google/callback', async (request, reply) => {
    const stateCookie = request.cookies[GOOGLE_STATE_COOKIE];
    reply.clearCookie(GOOGLE_STATE_COOKIE, {
      ...cookieOptions(),
      path: '/api/v1/auth/google/callback',
    });

    const query = GoogleCallbackQuerySchema.parse(request.query);
    if (!googleStateMatches(query.state, stateCookie)) {
      throw new AppError(400, 'INVALID_OAUTH_STATE', 'Google sign-in state is invalid or expired');
    }

    const profile = await exchangeGoogleCode(query.code);
    const session = await signInWithGoogle(profile);
    sendSession(reply, session);
    return reply.redirect(new URL('/auth/callback', config.FRONTEND_URL).toString());
  });
}
