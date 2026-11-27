import { decryptLLMCredential } from '@/lib/llmCredentials.js';
import { LLMProviderIdSchema, type LLMProviderId, type RuntimeLLMConfig } from '@/lib/llmProviders.js';

type StoredProvider = {
  model: string;
  baseUrl?: string;
  encryptedApiKey?: string;
  verifiedAt?: string;
};

export function asSettingsRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

export function readProviderSettings(settings: unknown): {
  activeProviderId?: LLMProviderId;
  providers: Record<string, StoredProvider>;
} {
  const llm = asSettingsRecord(asSettingsRecord(settings).llm);
  return {
    ...(LLMProviderIdSchema.safeParse(llm.activeProviderId).success
      ? { activeProviderId: llm.activeProviderId as LLMProviderId }
      : {}),
    providers: asSettingsRecord(llm.providers) as Record<string, StoredProvider>,
  };
}

export function publicSettings(settings: unknown): Record<string, unknown> {
  const value = asSettingsRecord(settings);
  const { activeProviderId, providers } = readProviderSettings(value);
  const safeProviders = Object.fromEntries(
    Object.entries(providers).map(([id, provider]) => [
      id,
      {
        model: provider.model,
        ...(provider.baseUrl ? { baseUrl: provider.baseUrl } : {}),
        configured: Boolean(provider.verifiedAt),
        ...(provider.verifiedAt ? { verifiedAt: provider.verifiedAt } : {}),
      },
    ]),
  );
  return {
    ...value,
    ...(value.llm
      ? { llm: { ...(activeProviderId ? { activeProviderId } : {}), providers: safeProviders } }
      : {}),
  };
}

export function getRuntimeLLMConfig(settings: unknown): RuntimeLLMConfig | undefined {
  const { activeProviderId, providers } = readProviderSettings(settings);
  if (!activeProviderId) return undefined;
  const provider = providers[activeProviderId];
  if (!provider) return undefined;
  return {
    provider: activeProviderId,
    api_key: provider.encryptedApiKey ? decryptLLMCredential(provider.encryptedApiKey) : '',
    model: provider.model,
    ...(provider.baseUrl ? { base_url: provider.baseUrl } : {}),
  };
}
