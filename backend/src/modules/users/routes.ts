import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '@/lib/prisma.js';
import { AppError } from '@/lib/errors.js';
import { deleteObject, uploadJsonExport } from '@/lib/storage.js';
import { decryptLLMCredential, encryptLLMCredential } from '@/lib/llmCredentials.js';
import { asSettingsRecord, publicSettings, readProviderSettings } from '@/lib/llmSettings.js';
import {
  LLMProviderConfigSchema,
  LLMProviderIdSchema,
  normalizeLocalBaseUrlForStorage,
  verifyLLMProvider,
  type RuntimeLLMConfig,
} from '@/lib/llmProviders.js';

const UpdateProfileSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  avatar_url: z.string().url().nullable().optional(),
}).refine((value) => Object.keys(value).length > 0);

const SettingsSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).optional(),
  language: z.string().trim().min(2).max(20).optional(),
}).refine((value) => Object.keys(value).length > 0);

function publicUser(user: {
  id: string; email: string; name: string; avatarUrl: string | null; createdAt: Date;
}) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatar_url: user.avatarUrl,
    created_at: user.createdAt,
  };
}

export default async function userRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('onRequest', fastify.authenticate);

  fastify.patch('/users/me', async (request) => {
    const body = UpdateProfileSchema.parse(request.body);
    const user = await prisma.user.update({
      where: { id: request.user!.id },
      data: {
        ...(body.name ? { name: body.name } : {}),
        ...(body.avatar_url !== undefined ? { avatarUrl: body.avatar_url } : {}),
      },
    });
    return publicUser(user);
  });

  fastify.get('/settings', async (request) => {
    const user = await prisma.user.findFirst({
      where: { id: request.user!.id, deletedAt: null },
      select: { settings: true },
    });
    if (!user) throw new AppError(404, 'NOT_FOUND', 'User not found');
    return {
      theme: 'system',
      language: 'en',
      ...publicSettings(user.settings),
    };
  });

  fastify.patch('/settings', async (request) => {
    const input = SettingsSchema.parse(request.body);
    const user = await prisma.user.findFirst({
      where: { id: request.user!.id, deletedAt: null },
      select: { settings: true },
    });
    if (!user) throw new AppError(404, 'NOT_FOUND', 'User not found');
    const storedSettings = { theme: 'system', language: 'en', ...asSettingsRecord(user.settings), ...input };
    await prisma.user.update({
      where: { id: request.user!.id },
      data: { settings: storedSettings },
    });
    return publicSettings(storedSettings);
  });

  fastify.post('/settings/llm/providers', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
  }, async (request) => {
    const input = LLMProviderConfigSchema.parse(request.body);
    const user = await prisma.user.findFirst({
      where: { id: request.user!.id, deletedAt: null },
      select: { settings: true },
    });
    if (!user) throw new AppError(404, 'NOT_FOUND', 'User not found');

    const settings = asSettingsRecord(user.settings);
    const llm = readProviderSettings(settings);
    const existing = llm.providers[input.providerId];
    const apiKey = input.apiKey?.trim()
      || (existing?.encryptedApiKey ? decryptLLMCredential(existing.encryptedApiKey) : '');
    const baseUrl = input.providerId === 'local'
      ? normalizeLocalBaseUrlForStorage(input.baseUrl)
      : undefined;
    const runtimeConfig: RuntimeLLMConfig = {
      provider: input.providerId,
      api_key: apiKey,
      model: input.model,
      ...(baseUrl ? { base_url: baseUrl } : {}),
    };
    await verifyLLMProvider(runtimeConfig);

    const providers = {
      ...llm.providers,
      [input.providerId]: {
        model: input.model,
        ...(baseUrl ? { baseUrl } : {}),
        ...(apiKey ? { encryptedApiKey: encryptLLMCredential(apiKey) } : {}),
        verifiedAt: new Date().toISOString(),
      } satisfies NonNullable<typeof llm.providers[string]>,
    };
    const updatedSettings = {
      ...settings,
      llm: { activeProviderId: input.providerId, providers },
    };
    await prisma.user.update({
      where: { id: request.user!.id },
      data: { settings: updatedSettings },
    });
    return publicSettings(updatedSettings);
  });

  fastify.delete('/settings/llm/providers/:providerId', async (request) => {
    const { providerId } = z.object({ providerId: LLMProviderIdSchema }).parse(request.params);
    const user = await prisma.user.findFirst({
      where: { id: request.user!.id, deletedAt: null },
      select: { settings: true },
    });
    if (!user) throw new AppError(404, 'NOT_FOUND', 'User not found');
    const settings = asSettingsRecord(user.settings);
    const llm = readProviderSettings(settings);
    const providers = { ...llm.providers };
    delete providers[providerId];
    const activeProviderId = llm.activeProviderId === providerId
      ? Object.keys(providers).find((id) => LLMProviderIdSchema.safeParse(id).success)
      : llm.activeProviderId;
    const updatedSettings = {
      ...settings,
      llm: { ...(activeProviderId ? { activeProviderId } : {}), providers },
    };
    await prisma.user.update({
      where: { id: request.user!.id },
      data: { settings: updatedSettings },
    });
    return publicSettings(updatedSettings);
  });

  fastify.patch('/settings/llm/active', async (request) => {
    const { providerId } = z.object({ providerId: LLMProviderIdSchema }).parse(request.body);
    const user = await prisma.user.findFirst({
      where: { id: request.user!.id, deletedAt: null },
      select: { settings: true },
    });
    if (!user) throw new AppError(404, 'NOT_FOUND', 'User not found');
    const settings = asSettingsRecord(user.settings);
    const llm = readProviderSettings(settings);
    if (!llm.providers[providerId]) {
      throw new AppError(409, 'PROVIDER_NOT_CONFIGURED', 'Verify and save this provider before selecting it');
    }
    const updatedSettings = {
      ...settings,
      llm: { ...llm, activeProviderId: providerId },
    };
    await prisma.user.update({
      where: { id: request.user!.id },
      data: { settings: updatedSettings },
    });
    return publicSettings(updatedSettings);
  });

  fastify.post('/settings/export', async (request) => {
    const userId = request.user!.id;
    const [user, subjects, documents, topics, notes, artifacts, quizzes, attempts, progressEvents] =
      await Promise.all([
        prisma.user.findFirst({
          where: { id: userId },
          select: { id: true, email: true, name: true, avatarUrl: true, createdAt: true, settings: true },
        }),
        prisma.subject.findMany({ where: { userId } }),
        prisma.document.findMany({ where: { userId } }),
        prisma.topic.findMany({ where: { subject: { userId } } }),
        prisma.note.findMany({ where: { userId } }),
        prisma.artifact.findMany({ where: { userId } }),
        prisma.quiz.findMany({ where: { userId } }),
        prisma.attempt.findMany({ where: { userId } }),
        prisma.progressEvent.findMany({ where: { userId } }),
      ]);
    if (!user) throw new AppError(404, 'NOT_FOUND', 'User not found');
    try {
      return { download_url: await uploadJsonExport(userId, {
        user: { ...user, settings: publicSettings(user.settings) },
        subjects, documents, topics, notes, artifacts, quizzes, attempts, progressEvents,
      }) };
    } catch {
      throw new AppError(502, 'EXPORT_FAILED', 'Your data export could not be created');
    }
  });

  fastify.delete('/users/me', async (request, reply) => {
    const user = await prisma.user.findFirst({
      where: { id: request.user!.id },
      include: { documents: { select: { fileKey: true } } },
    });
    if (!user) throw new AppError(404, 'NOT_FOUND', 'User not found');
    try {
      for (const document of user.documents) await deleteObject(document.fileKey);
    } catch {
      throw new AppError(502, 'STORAGE_DELETE_FAILED', 'Account files could not be deleted');
    }
    await prisma.user.delete({ where: { id: user.id } });
    return reply.status(204).send();
  });
}
