import { z } from 'zod';

/**
 * Central, validated configuration. Next.js loads `.env` automatically.
 * Import `env` anywhere instead of reading process.env directly.
 *
 * DATABASE_URL is only required at runtime (not during `next build`), so we
 * parse lazily and keep non-secret fields optional with sensible defaults.
 */
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  DATABASE_URL: z.string().url().optional(),

  JWT_SECRET: z.string().min(1).default('change-me-in-production'),
  JWT_EXPIRES_IN: z.string().default('7d'),

  // MVP AI provider: Gemini (free tier). OpenAI is optional.
  AI_PROVIDER: z.enum(['gemini', 'openai']).default('gemini'),

  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default('gemini-flash-latest'),

  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),
});

export type Env = z.infer<typeof schema>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    console.error('❌ Invalid environment configuration:', parsed.error.flatten().fieldErrors);
    throw new Error('Invalid environment configuration');
  }
  cached = parsed.data;
  return cached;
}

export const env = new Proxy({} as Env, {
  get: (_t, key: string) => getEnv()[key as keyof Env],
});
