import { lookup } from 'node:dns/promises';
import { BlockList, isIP } from 'node:net';
import { z } from 'zod';
import { config } from '@/config.js';
import { AppError } from '@/lib/errors.js';

export const LLMProviderIdSchema = z.enum(['anthropic', 'openai', 'gemini', 'grok', 'groq', 'local']);
export type LLMProviderId = z.infer<typeof LLMProviderIdSchema>;

export const LLMProviderConfigSchema = z.object({
  providerId: LLMProviderIdSchema,
  apiKey: z.string().trim().max(4_096).optional(),
  model: z.string().trim().min(1).max(200),
  baseUrl: z.string().trim().max(500).optional(),
});

export interface RuntimeLLMConfig {
  provider: LLMProviderId;
  api_key: string;
  model: string;
  base_url?: string;
}

const blockedAddresses = new BlockList();
[
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8],
  ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24],
  ['192.88.99.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15], ['198.51.100.0', 24],
  ['203.0.113.0', 24], ['224.0.0.0', 4], ['240.0.0.0', 4],
].forEach(([address, prefix]) => blockedAddresses.addSubnet(String(address), Number(prefix), 'ipv4'));
[
  ['::', 128], ['::1', 128], ['64:ff9b::', 96], ['100::', 64],
  ['2001:db8::', 32], ['2002::', 16], ['fc00::', 7], ['fe80::', 10], ['ff00::', 8],
].forEach(([address, prefix]) => blockedAddresses.addSubnet(String(address), Number(prefix), 'ipv6'));

function isLoopbackHost(hostname: string): boolean {
  const host = hostname.replace(/^\[|\]$/g, '').toLowerCase();
  return host === 'localhost' ||
    host.endsWith('.localhost') ||
    host === 'host.docker.internal' ||
    (isIP(host) === 4 && host.startsWith('127.')) ||
    (isIP(host) === 6 && host === '::1');
}

function isPublicAddress(address: string): boolean {
  const family = isIP(address);
  if (!family) return false;
  if (family === 6 && !/^[23]/.test(address.toLowerCase())) return false;
  return !blockedAddresses.check(address, family === 4 ? 'ipv4' : 'ipv6');
}

function normalizedHostname(hostname: string): string {
  return hostname.toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '');
}

function isExplicitlyAllowedHost(hostname: string): boolean {
  return config.LLM_LOCAL_ALLOWED_HOSTS
    .split(',')
    .map(normalizedHostname)
    .map((host) => host.trim())
    .filter(Boolean)
    .includes(normalizedHostname(hostname));
}

function normalizeLocalBaseUrl(baseUrl?: string): URL {
  const rawUrl = baseUrl?.trim();
  if (!rawUrl) {
    throw new AppError(400, 'INVALID_LOCAL_ENDPOINT', 'Enter a Local provider base URL');
  }
  const hasScheme = /^[a-z][a-z\d+.-]*:\/\//i.test(rawUrl);
  const withoutScheme = hasScheme ? rawUrl.replace(/^[a-z][a-z\d+.-]*:\/\//i, '') : rawUrl;
  let host: string;
  try {
    host = new URL(`http://${withoutScheme}`).hostname;
  } catch {
    throw new AppError(400, 'INVALID_LOCAL_ENDPOINT', 'Enter a valid HTTP(S) provider base URL');
  }
  const parsedHost = normalizedHostname(host);
  const scheme = isLoopbackHost(parsedHost) ||
    isExplicitlyAllowedHost(parsedHost) ||
    (isIP(parsedHost) > 0 && !isPublicAddress(parsedHost))
    ? 'http://'
    : 'https://';
  let endpoint: URL;
  try {
    endpoint = new URL(hasScheme ? rawUrl : `${scheme}${rawUrl}`);
  } catch {
    throw new AppError(400, 'INVALID_LOCAL_ENDPOINT', 'Enter a valid HTTP(S) provider base URL');
  }
  if (
    !['http:', 'https:'].includes(endpoint.protocol) ||
    !endpoint.hostname ||
    endpoint.username ||
    endpoint.password ||
    endpoint.search ||
    endpoint.hash
  ) {
    throw new AppError(400, 'INVALID_LOCAL_ENDPOINT', 'Provider base URL must be HTTP(S), without credentials, query, or fragment');
  }
  endpoint.pathname = endpoint.pathname.replace(/\/+$/, '') || '';
  return endpoint;
}

export function normalizeLocalBaseUrlForStorage(baseUrl?: string): string {
  return normalizeLocalBaseUrl(baseUrl).toString().replace(/\/$/, '');
}

export async function normalizeAndValidateLocalBaseUrl(baseUrl?: string): Promise<string> {
  const endpoint = normalizeLocalBaseUrl(baseUrl);
  const hostname = normalizedHostname(endpoint.hostname);
  const explicitlyAllowed = isExplicitlyAllowedHost(hostname);

  if (isLoopbackHost(hostname) || explicitlyAllowed) return endpoint.toString().replace(/\/$/, '');
  if (endpoint.protocol !== 'https:') {
    throw new AppError(400, 'INVALID_LOCAL_ENDPOINT', 'Custom remote provider URLs must use HTTPS');
  }

  const family = isIP(hostname);
  const addresses = family
    ? [{ address: hostname }]
    : await lookup(hostname, { all: true, verbatim: true }).catch(() => []);
  if (!addresses.length || addresses.some(({ address }) => !isPublicAddress(address))) {
    throw new AppError(
      400,
      'INVALID_LOCAL_ENDPOINT',
      'Provider URL must resolve to a public address; explicitly allow private hosts in LLM_LOCAL_ALLOWED_HOSTS',
    );
  }
  return endpoint.toString().replace(/\/$/, '');
}

async function getProviderErrorMessage(response: Response): Promise<string | undefined> {
  try {
    const payload = await response.json() as {
      error?: string | { message?: unknown };
      message?: unknown;
    };
    if (typeof payload.error === 'string') return payload.error.slice(0, 300);
    if (
      payload.error &&
      typeof payload.error === 'object' &&
      typeof payload.error.message === 'string'
    ) {
      return payload.error.message.slice(0, 300);
    }
    if (typeof payload.message === 'string') return payload.message.slice(0, 300);
  } catch {
    return undefined;
  }
  return undefined;
}

function providerUrl(providerId: LLMProviderId, baseUrl?: string): string {
  if (providerId === 'anthropic') return 'https://api.anthropic.com/v1/messages';
  if (providerId === 'openai') return 'https://api.openai.com/v1/chat/completions';
  if (providerId === 'gemini') return `https://generativelanguage.googleapis.com/v1beta/models`;
  if (providerId === 'grok') return 'https://api.x.ai/v1/chat/completions';
  if (providerId === 'groq') return 'https://api.groq.com/openai/v1/chat/completions';

  const endpoint = normalizeLocalBaseUrl(baseUrl);
  const path = endpoint.pathname.replace(/\/+$/, '');
  const completionPath = path.toLowerCase().endsWith('/chat/completions')
    ? path
    : `${path}/chat/completions`;
  return `${endpoint.origin}${completionPath}`;
}

export async function verifyLLMProvider(input: RuntimeLLMConfig): Promise<void> {
  if (input.provider !== 'local' && !input.api_key) {
    throw new AppError(400, 'API_KEY_REQUIRED', 'An API key is required for this provider');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  let url: string;
  let body: Record<string, unknown>;

  if (input.provider === 'anthropic') {
    url = providerUrl(input.provider);
    headers['x-api-key'] = input.api_key;
    headers['anthropic-version'] = '2023-06-01';
    body = {
      model: input.model,
      max_tokens: 8,
      messages: [{ role: 'user', content: 'Reply with OK.' }],
    };
  } else if (input.provider === 'gemini') {
    url = `${providerUrl(input.provider)}/${encodeURIComponent(input.model)}:generateContent`;
    headers['x-goog-api-key'] = input.api_key;
    body = { contents: [{ parts: [{ text: 'Reply with OK.' }] }] };
  } else {
    if (input.provider === 'local') {
      input.base_url = await normalizeAndValidateLocalBaseUrl(input.base_url);
    }
    url = providerUrl(input.provider, input.base_url);
    if (input.api_key) headers.Authorization = `Bearer ${input.api_key}`;
    body = {
      model: input.model,
      max_tokens: 8,
      messages: [{ role: 'user', content: 'Reply with OK.' }],
    };
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
      redirect: 'error',
    });
    if (!response.ok) {
      const providerMessage = await getProviderErrorMessage(response);
      throw new AppError(
        400,
        'PROVIDER_VERIFICATION_FAILED',
        `Provider rejected the verification request (HTTP ${response.status})${providerMessage ? `: ${providerMessage}` : ''}`,
      );
    }
    const result = await response.json() as Record<string, unknown>;
    const generatedText = input.provider === 'anthropic'
      ? Array.isArray(result.content)
        ? result.content.some((part) => Boolean(part && typeof part === 'object' && 'text' in part))
        : false
      : input.provider === 'gemini'
        ? Array.isArray(result.candidates)
        : Array.isArray(result.choices);
    if (!generatedText) {
      throw new AppError(400, 'PROVIDER_INVALID_RESPONSE', 'Provider did not return a valid generation response');
    }
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (controller.signal.aborted) {
      throw new AppError(504, 'PROVIDER_TIMEOUT', 'Provider verification timed out');
    }
    throw new AppError(502, 'PROVIDER_UNAVAILABLE', 'Could not reach the selected provider');
  } finally {
    clearTimeout(timeout);
  }
}
