import { createHmac, timingSafeEqual } from 'node:crypto';
import { config } from '@/config.js';

export function signPayload(payload: string, secret = config.JOB_CALLBACK_SECRET): string {
  return `sha256=${createHmac('sha256', secret).update(payload).digest('hex')}`;
}

export function verifySignature(
  payload: string,
  signature: string | string[] | undefined,
  secret = config.JOB_CALLBACK_SECRET,
): boolean {
  const provided = Array.isArray(signature) ? signature[0] : signature;
  if (!provided) {
    return false;
  }

  const expected = signPayload(payload, secret);
  if (provided.length !== expected.length) {
    return false;
  }

  try {
    return timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
  } catch {
    return false;
  }
}
