import { z } from 'zod';

const durationToSeconds = (value: string): number => {
  const match = /^(\d+)([smhd])$/.exec(value);
  if (!match) {
    throw new Error('Invalid duration');
  }

  const multipliers = { s: 1, m: 60, h: 3_600, d: 86_400 } as const;
  return Number(match[1]) * multipliers[match[2] as keyof typeof multipliers];
};

const optionalNonEmptyString = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().optional(),
);

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3001),
  HOST: z.string().default('0.0.0.0'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().url().default('redis://localhost:6379'),
  BACKEND_URL: z.string().url().default('http://localhost:3001'),
  AGENTS_SERVICE_URL: z.string().url().default('http://localhost:8000'),
  AGENTS_SERVICE_API_KEY: z.string().min(32).default('development-agents-service-key-32chars'),
  JOB_CALLBACK_SECRET: z.string().min(32).default('development-job-callback-secret-32chars'),
  S3_ENDPOINT: z.string().url().default('http://localhost:9000'),
  S3_REGION: z.string().min(1).default('us-east-1'),
  S3_ACCESS_KEY: z.string().min(1),
  S3_SECRET_KEY: z.string().min(1),
  S3_BUCKET: z.string().min(1).default('slos-uploads'),
  S3_FORCE_PATH_STYLE: z.preprocess(
    (value) => (typeof value === 'string' ? value.toLowerCase() === 'true' : value),
    z.boolean().default(true),
  ),
  PRESIGNED_URL_TTL_SECONDS: z.coerce.number().int().min(60).max(3_600).default(900),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRES_IN: z.string().regex(/^\d+[smhd]$/).default('15m').transform(durationToSeconds),
  JWT_REFRESH_EXPIRES_IN: z.string().regex(/^\d+[smhd]$/).default('7d').transform(durationToSeconds),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),
  GOOGLE_CLIENT_ID: optionalNonEmptyString,
  GOOGLE_CLIENT_SECRET: optionalNonEmptyString,
  GOOGLE_CALLBACK_URL: z.string().url().default('http://localhost:3001/api/v1/auth/google/callback'),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  throw new Error(`Invalid environment configuration: ${z.prettifyError(parsedEnv.error)}`);
}

export const config = parsedEnv.data;
