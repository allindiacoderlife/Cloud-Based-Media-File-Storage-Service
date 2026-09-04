import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('5000').transform((val) => parseInt(val, 10)),
  API_PREFIX: z.string().default('/api/v1'),
  CLIENT_ORIGIN: z.string().default('http://localhost:3000'),

  // Supabase Configuration
  SUPABASE_URL: z.string().default('https://example.supabase.co'),
  SUPABASE_ANON_KEY: z.string().default('default-anon-key'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().default('default-service-role-key'),
  SUPABASE_STORAGE_BUCKET: z.string().default('cloud-media-storage'),

  // Redis Configuration
  REDIS_URL: z.string().optional(),
  REDIS_HOST: z.string().default('127.0.0.1'),
  REDIS_PORT: z.string().default('6379').transform((val) => parseInt(val, 10)),
  REDIS_PASSWORD: z.string().optional().default(''),
  REDIS_TLS: z.string().default('false').transform((val) => val === 'true'),

  // JWT Configuration
  JWT_SECRET: z.string().default('dev-secret-key-change-in-prod'),
  JWT_EXPIRES_IN: z.string().default('7d'),

  // SMTP / Nodemailer Configuration
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().default('587').transform((val) => parseInt(val, 10)),
  SMTP_SECURE: z.string().default('false').transform((val) => val === 'true'),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default('"CloudVault" <noreply@cloudvault.com>')
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.warn('⚠️ Environment variables warning:', _env.error.format());
}

export const env = _env.success ? _env.data : (envSchema.parse({}) as z.infer<typeof envSchema>);
