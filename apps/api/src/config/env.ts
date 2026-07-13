import path from 'node:path';
import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';

// Single source of truth for config lives in the repo root .env.
// Workspace scripts run with cwd = apps/api, so resolve two levels up.
// (A local apps/api/.env, if present, still wins via the default load.)
loadDotenv({ path: path.resolve(process.cwd(), '../../.env') });
loadDotenv();

/**
 * Central, validated configuration. Import `env` anywhere instead of
 * reading process.env directly, so a missing/invalid value fails fast
 * at boot with a clear message.
 */
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().default(4000),
  CORS_ORIGINS: z.string().default('http://localhost:3000'),

  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().default('redis://localhost:6379'),

  JWT_SECRET: z.string().min(1).default('change-me-in-production'),
  JWT_EXPIRES_IN: z.string().default('7d'),

  AI_PROVIDER: z.enum(['gemini', 'ollama', 'openai', 'anthropic']).default('gemini'),

  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default('gemini-2.0-flash'),

  OLLAMA_BASE_URL: z.string().default('http://localhost:11434'),
  OLLAMA_MODEL: z.string().default('llama3.1'),

  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),

  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().default('claude-sonnet-5'),

  STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
  STORAGE_LOCAL_DIR: z.string().default('./storage'),

  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_CHAT_ID: z.string().optional(),

  // ── Job Finder (M1) ──
  JOB_FINDER_ENABLED: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),
  JOB_FINDER_INTERVAL_MIN: z.coerce.number().default(30),
  JOB_FINDER_QUERY: z.string().default('react developer'),
  JOB_FINDER_LIMIT: z.coerce.number().default(25),

  AUTO_SUBMIT: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),
  PLAYWRIGHT_HEADLESS: z
    .string()
    .default('true')
    .transform((v) => v !== 'false'),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('❌ Invalid environment configuration:');
  // eslint-disable-next-line no-console
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

export const corsOrigins = env.CORS_ORIGINS.split(',')
  .map((o) => o.trim())
  .filter(Boolean);
