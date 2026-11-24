import { z } from 'zod';

export const RegisterSchema = z.object({
  email: z.string().trim().pipe(z.email().max(254)).transform((email) => email.toLowerCase()),
  password: z.string().min(8).max(72),
  name: z.string().trim().min(1).max(100),
});

export const LoginSchema = z.object({
  email: z.string().trim().pipe(z.email().max(254)).transform((email) => email.toLowerCase()),
  password: z.string().min(1).max(72),
});

export const GoogleCallbackQuerySchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
