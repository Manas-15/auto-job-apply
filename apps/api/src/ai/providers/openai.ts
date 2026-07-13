import { env } from '../../config/env.js';
import { AppError } from '../../lib/errors.js';
import type { AiProvider, AiResult, ChatMessage, GenerateOptions } from '../types.js';

/** OpenAI Chat Completions (paid). */
export class OpenAiProvider implements AiProvider {
  readonly name = 'openai';
  readonly model = env.OPENAI_MODEL;

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
      throw new AppError(502, `OpenAI request failed (${res.status})`, body.slice(0, 500));
    }

    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return { text: data.choices?.[0]?.message?.content ?? '', model: this.model };
  }
}
