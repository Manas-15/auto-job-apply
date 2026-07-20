import { env } from '../env';
import { AppError } from '../errors';
import { GeminiProvider } from './gemini';
import { OpenAiProvider } from './openai';
import type { AiProvider, ChatMessage, GenerateOptions } from './types';

function build(name: string): AiProvider {
  switch (name) {
    case 'gemini':
      return new GeminiProvider();
    case 'openai':
      return new OpenAiProvider();
    default:
      throw new AppError(500, `Unknown AI provider: ${name}`);
  }
}

/** The provider selected by AI_PROVIDER (default: gemini). */
export function getAi(): AiProvider {
  return build(env.AI_PROVIDER);
}

export type { AiProvider, ChatMessage, GenerateOptions } from './types';

/**
 * Call the model expecting JSON back and parse it robustly. Gemini's JSON mode
 * intermittently returns malformed output (a dropped closing brace) or a
 * transient 5xx, so we retry a couple of times before giving up.
 */
export async function generateJson<T>(
  messages: ChatMessage[],
  opts: GenerateOptions = {},
  retries = 2,
): Promise<{ data: T; model: string }> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const { text, model } = await getAi().generate(messages, { ...opts, json: true });
      return { data: parseJson<T>(text), model };
    } catch (err) {
      lastErr = err;
      // Don't waste retries on errors that won't fix themselves.
      if (err instanceof AppError && [401, 403, 429].includes(err.statusCode)) throw err;
      if (attempt < retries) await sleep(400 * (attempt + 1));
    }
  }
  throw lastErr;
}

export function parseJson<T>(text: string): T {
  const cleaned = stripCodeFence(text).trim();
  // Try the raw text, the first JSON-looking span, and repaired versions of each.
  const span = cleaned.match(/[[{][\s\S]*[\]}]/)?.[0];
  for (const candidate of [cleaned, span]) {
    if (!candidate) continue;
    for (const variant of [candidate, repairJson(candidate)]) {
      try {
        return JSON.parse(variant) as T;
      } catch {
        /* try the next variant */
      }
    }
  }
  throw new AppError(502, 'AI returned malformed JSON', cleaned.slice(0, 500));
}

/**
 * Best-effort repair of near-valid JSON: closes an unterminated string, appends
 * any missing closing brackets/braces (tracking string state so braces inside
 * strings don't count), and drops trailing commas.
 */
function repairJson(input: string): string {
  const stack: string[] = [];
  let inString = false;
  let escaped = false;

  for (const ch of input) {
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === '{' || ch === '[') stack.push(ch);
    else if (ch === '}' || ch === ']') stack.pop();
  }

  let repaired = input;
  if (inString) repaired += '"';
  for (let i = stack.length - 1; i >= 0; i--) {
    repaired += stack[i] === '{' ? '}' : ']';
  }
  // Remove trailing commas that would break the closers we just added.
  return repaired.replace(/,(\s*[}\]])/g, '$1');
}

function stripCodeFence(text: string): string {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return fence?.[1] ?? text;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
