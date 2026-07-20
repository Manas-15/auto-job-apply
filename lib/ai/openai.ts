import { env } from '../env';
import { AppError } from '../errors';
import type { AiProvider, AiResult, ChatMessage, GenerateOptions } from './types';

/** OpenAI Chat Completions (optional provider). Set AI_PROVIDER=openai to use. */
export class OpenAiProvider implements AiProvider {
  readonly name = 'openai';
  get model() {
    return env.OPENAI_MODEL;
  }

  async generate(messages: ChatMessage[], opts: GenerateOptions = {}): Promise<AiResult> {
    if (!env.OPENAI_API_KEY) {
      throw new AppError(500, 'OPENAI_API_KEY is not configured');
    }

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: opts.temperature ?? 0.4,
        max_tokens: opts.maxTokens ?? 2048,
        ...(opts.json ? { response_format: { type: 'json_object' } } : {}),
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      if (res.status === 429) {
        throw new AppError(
          429,
          'OpenAI quota exceeded — the plan limit has been reached. Switch to another AI provider or check your billing.',
          body.slice(0, 500),
          'AI_QUOTA_EXCEEDED',
        );
      }
      if (res.status === 401 || res.status === 403) {
        throw new AppError(
          res.status,
          'OpenAI rejected the API key. Check OPENAI_API_KEY, or switch to another AI provider.',
          body.slice(0, 500),
          'AI_AUTH',
        );
      }
      throw new AppError(502, `OpenAI request failed (${res.status})`, body.slice(0, 500), 'AI_UNAVAILABLE');
    }

    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = data.choices?.[0]?.message?.content ?? '';
    return { text, model: this.model };
  }
}
