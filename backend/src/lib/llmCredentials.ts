import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { config } from '@/config.js';

const key = createHash('sha256')
  .update(config.LLM_CREDENTIALS_ENCRYPTION_KEY ?? config.JWT_SECRET)
  .digest();

export function encryptLLMCredential(value: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, ciphertext].map((part) => part.toString('base64url')).join('.');
}

export function decryptLLMCredential(value: string): string {
  const [encodedIv, encodedTag, encodedCiphertext] = value.split('.');
  if (!encodedIv || !encodedTag || !encodedCiphertext) {
    throw new Error('Stored LLM credential is invalid');
  }
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(encodedIv, 'base64url'));
  decipher.setAuthTag(Buffer.from(encodedTag, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(encodedCiphertext, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}
