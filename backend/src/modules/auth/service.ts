import { createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { Prisma, User } from '@prisma/client';
import { config } from '@/config.js';
import { prisma } from '@/lib/prisma.js';
import { AppError } from '@/lib/errors.js';
import type { LoginInput, RegisterInput } from './schemas.js';

const REFRESH_TOKEN_BYTES = 48;
const BCRYPT_ROUNDS = 12;

export type PublicUser = Pick<User, 'id' | 'email' | 'name' | 'avatarUrl' | 'createdAt'>;
type DbClient = typeof prisma | Prisma.TransactionClient;

export interface AuthSession {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
}

function publicUser(user: User): PublicUser {
  const { id, email, name, avatarUrl, createdAt } = user;
  return { id, email, name, avatarUrl, createdAt };
}

function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function createAccessToken(user: Pick<User, 'id' | 'email'>): string {
  return jwt.sign(
    { email: user.email, type: 'access' },
    config.JWT_SECRET,
    { subject: user.id, expiresIn: config.JWT_ACCESS_EXPIRES_IN },
  );
}

async function storeRefreshToken(userId: string): Promise<string> {
  const token = randomBytes(REFRESH_TOKEN_BYTES).toString('base64url');
  const expiresAt = new Date(Date.now() + config.JWT_REFRESH_EXPIRES_IN * 1_000);

  await prisma.refreshToken.create({
    data: { userId, tokenHash: hashRefreshToken(token), expiresAt },
  });

  return token;
}

async function createSession(user: User): Promise<AuthSession> {
  const refreshToken = await storeRefreshToken(user.id);
  return {
    user: publicUser(user),
    accessToken: createAccessToken(user),
    refreshToken,
  };
}

export async function register(input: RegisterInput): Promise<AuthSession> {
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  let user: User;

  try {
    user = await prisma.user.create({
      data: { email: input.email, name: input.name, passwordHash },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new AppError(409, 'EMAIL_IN_USE', 'An account with this email already exists');
    }
    throw error;
  }

  return createSession(user);
}

export async function login(input: LoginInput): Promise<AuthSession> {
  const user = await prisma.user.findFirst({
    where: { email: input.email, deletedAt: null },
  });
  const validPassword =
    user?.passwordHash !== null && user?.passwordHash !== undefined
      ? await bcrypt.compare(input.password, user.passwordHash)
      : false;

  if (!user || !validPassword) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect');
  }

  return createSession(user);
}

export async function refresh(token: string): Promise<AuthSession> {
  if (!token) {
    throw new AppError(401, 'INVALID_REFRESH_TOKEN', 'Refresh token is invalid or expired');
  }

  const tokenHash = hashRefreshToken(token);
  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!stored || stored.expiresAt <= new Date() || stored.user.deletedAt !== null) {
    if (stored) {
      await prisma.refreshToken.deleteMany({ where: { id: stored.id } });
    }
    throw new AppError(401, 'INVALID_REFRESH_TOKEN', 'Refresh token is invalid or expired');
  }

  const nextRefreshToken = randomBytes(REFRESH_TOKEN_BYTES).toString('base64url');
  const nextExpiresAt = new Date(Date.now() + config.JWT_REFRESH_EXPIRES_IN * 1_000);

  await prisma.$transaction(async (transaction) => {
    const deleted = await transaction.refreshToken.deleteMany({ where: { id: stored.id } });
    if (deleted.count !== 1) {
      throw new AppError(401, 'INVALID_REFRESH_TOKEN', 'Refresh token has already been used');
    }
    await transaction.refreshToken.create({
      data: {
        userId: stored.userId,
        tokenHash: hashRefreshToken(nextRefreshToken),
        expiresAt: nextExpiresAt,
      },
    });
  });

  return {
    user: publicUser(stored.user),
    accessToken: createAccessToken(stored.user),
    refreshToken: nextRefreshToken,
  };
}

export async function logout(token: string | undefined): Promise<void> {
  if (!token) return;
  await prisma.refreshToken.deleteMany({ where: { tokenHash: hashRefreshToken(token) } });
}

export async function getCurrentUser(userId: string): Promise<PublicUser> {
  const user = await prisma.user.findFirst({ where: { id: userId, deletedAt: null } });
  if (!user) {
    throw new AppError(401, 'UNAUTHORIZED', 'User account is unavailable');
  }
  return publicUser(user);
}

export async function signInWithGoogle(profile: {
  googleId: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}): Promise<AuthSession> {
  const existingGoogleUser = await prisma.user.findUnique({ where: { googleId: profile.googleId } });
  if (existingGoogleUser) {
    if (existingGoogleUser.deletedAt !== null) {
      throw new AppError(401, 'UNAUTHORIZED', 'User account is unavailable');
    }
    const user = await prisma.user.update({
      where: { id: existingGoogleUser.id },
      data: { name: profile.name, avatarUrl: profile.avatarUrl },
    });
    return createSession(user);
  }

  const existingEmailUser = await prisma.user.findUnique({ where: { email: profile.email } });
  if (existingEmailUser) {
    if (existingEmailUser.deletedAt !== null) {
      throw new AppError(401, 'UNAUTHORIZED', 'User account is unavailable');
    }
    if (existingEmailUser.googleId && existingEmailUser.googleId !== profile.googleId) {
      throw new AppError(409, 'GOOGLE_ACCOUNT_CONFLICT', 'This email is linked to another Google account');
    }
    const user = await prisma.user.update({
      where: { id: existingEmailUser.id },
      data: { googleId: profile.googleId, name: profile.name, avatarUrl: profile.avatarUrl },
    });
    return createSession(user);
  }

  try {
    const user = await prisma.user.create({
      data: {
        email: profile.email,
        name: profile.name,
        avatarUrl: profile.avatarUrl,
        googleId: profile.googleId,
      },
    });
    return createSession(user);
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error;

    const racedUser = await prisma.user.findUnique({ where: { googleId: profile.googleId } });
    if (!racedUser || racedUser.deletedAt !== null) throw error;
    return createSession(racedUser);
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2002'
  );
}
