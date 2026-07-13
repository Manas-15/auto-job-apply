import { env } from '../config/env.js';
import { AppError } from '../lib/errors.js';
import { AnthropicProvider } from './providers/anthropic.js';
import { GeminiProvider } from './providers/gemini.js';
import { OllamaProvider } from './providers/ollama.js';
import { OpenAiProvider } from './providers/openai.js';
import type { AiProvider, ChatMessage, GenerateOptions } from './types.js';

function build(name: typeof env.AI_PROVIDER): AiProvider {
  switch (name) {
    case 'gemini':
      return new GeminiProvider();
    case 'ollama':
      return new OllamaProvider();
    case 'openai':
      return new OpenAiProvider();
    case 'anthropic':
      return new AnthropicProvider();
    default:
      throw new AppError(500, `Unknown AI provider: ${name}`);
  }
}

/** The default provider selected by AI_PROVIDER. */
export const ai: AiProvider = build(env.AI_PROVIDER);

export type { AiProvider, ChatMessage, GenerateOptions } from './types.js';

/**
 * Call the model expecting JSON back and parse it robustly — local
 * models often wrap JSON in ```json fences or add stray prose.
 */
export async function generateJson<T>(
  messages: ChatMessage[],
  opts: GenerateOptions = {},
): Promise<{ data: T; model: string }> {
  const { text, model } = await ai.generate(messages, { ...opts, json: true });
  return { data: parseJson<T>(text), model };
}

export function parseJson<T>(text: string): T {
  const cleaned = stripCodeFence(text).trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Fall back to the first {...} or [...] block in the response.
    const match = cleaned.match(/[[{][\s\S]*[\]}]/);
    if (match) {
      try {
        return JSON.parse(match[0]) as T;
      } catch {
        /* fall through */
      }
    }
    throw new AppError(502, 'AI returned malformed JSON', cleaned.slice(0, 500));
  }
}

function stripCodeFence(text: string): string {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return fence?.[1] ?? text;
}
