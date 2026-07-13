import { env } from '../../config/env.js';
import { AppError } from '../../lib/errors.js';
import type { AiProvider, AiResult, ChatMessage, GenerateOptions } from '../types.js';

/**
 * Google Gemini via the Generative Language REST API. Has a free tier —
 * get a key at https://aistudio.google.com/apikey
 */
export class GeminiProvider implements AiProvider {
  readonly name = 'gemini';
  readonly model = env.GEMINI_MODEL;

  async generate(messages: ChatMessage[], opts: GenerateOptions = {}): Promise<AiResult> {
    if (!env.GEMINI_API_KEY) {
      throw new AppError(500, 'GEMINI_API_KEY is not configured');
    }

    // Gemini has no dedicated system role; prepend system text to the first user turn.
    const systemText = messages
      .filter((m) => m.role === 'system')
      .map((m) => m.content)
      .join('\n\n');

    const contents = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    if (systemText && contents.length > 0 && contents[0]) {
      contents[0].parts[0]!.text = `${systemText}\n\n${contents[0].parts[0]!.text}`;
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${env.GEMINI_API_KEY}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: opts.temperature ?? 0.4,
          maxOutputTokens: opts.maxTokens ?? 2048,
          ...(opts.json ? { responseMimeType: 'application/json' } : {}),
        },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new AppError(502, `Gemini request failed (${res.status})`, body.slice(0, 500));
    }

    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
    return { text, model: this.model };
  }
}
