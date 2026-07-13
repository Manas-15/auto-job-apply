import { env } from '../../config/env.js';
import { AppError } from '../../lib/errors.js';
import type { AiProvider, AiResult, ChatMessage, GenerateOptions } from '../types.js';

/** Anthropic Claude Messages API (paid). */
export class AnthropicProvider implements AiProvider {
  readonly name = 'anthropic';
  readonly model = env.ANTHROPIC_MODEL;

  async generate(messages: ChatMessage[], opts: GenerateOptions = {}): Promise<AiResult> {
    if (!env.ANTHROPIC_API_KEY) {
      throw new AppError(500, 'ANTHROPIC_API_KEY is not configured');
    }

    const system = messages
      .filter((m) => m.role === 'system')
      .map((m) => m.content)
      .join('\n\n');

    const rest = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: opts.maxTokens ?? 2048,
        temperature: opts.temperature ?? 0.4,
        ...(system ? { system } : {}),
        messages: rest,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new AppError(502, `Anthropic request failed (${res.status})`, body.slice(0, 500));
    }

    const data = (await res.json()) as { content?: { text?: string }[] };
    const text = data.content?.map((c) => c.text ?? '').join('') ?? '';
    return { text, model: this.model };
  }
}
