import { config as loadEnv } from 'dotenv';
import { z } from 'zod';

loadEnv();

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  CLIENT_ORIGIN: z.string().url('CLIENT_ORIGIN must be a valid URL'),
  TRUEFORGE_BASE_URL: z
    .string()
    .url()
    .default('http://localhost:8790'),
  TRUEFORGE_TOKEN: z.preprocess(
    (v) => (v === '' || v === undefined || v === null ? undefined : v),
    z.string().min(1).optional(),
  ),
  TRUEFORGE_AGENT_NAME: z.preprocess(
    (v) => (v === '' || v === undefined || v === null ? undefined : v),
    z.string().min(1).optional(),
  ),
  TRUEFORGE_MODEL: z.string().min(1).default('anthropic/claude-sonnet-4-6'),
  SETTINGS_ENCRYPTION_KEY: z
    .string()
    .regex(/^[0-9a-fA-F]{64}$/, 'SETTINGS_ENCRYPTION_KEY must be 64 hex chars (32 bytes)'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(60),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = z.infer<typeof envSchema>;
