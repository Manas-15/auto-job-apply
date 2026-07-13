import { env } from '../../config/env.js';
import { AppError } from '../../lib/errors.js';
import type { AiProvider, AiResult, ChatMessage, GenerateOptions } from '../types.js';

/**
 * Ollama — fully local, free LLMs. Install from https://ollama.com and
 * `ollama pull llama3.1`. No API key required.
 */
export class OllamaProvider implements AiProvider {
  readonly name = 'ollama';
  readonly model = env.OLLAMA_MODEL;

  async generate(messages: ChatMessage[], opts: GenerateOptions = {}): Promise<AiResult> {
    const res = await fetch(`${env.OLLAMA_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        messages,
        stream: false,
        ...(opts.json ? { format: 'json' } : {}),
        options: { temperature: opts.temperature ?? 0.4 },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new AppError(502, `Ollama request failed (${res.status})`, body.slice(0, 500));
    }

    const data = (await res.json()) as { message?: { content?: string } };
    return { text: data.message?.content ?? '', model: this.model };
  }
}
