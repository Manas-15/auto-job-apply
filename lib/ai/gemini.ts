import { env } from '../env';
import { AppError } from '../errors';
import type { AiProvider, AiResult, ChatMessage, GenerateOptions } from './types';

/**
 * Google Gemini via the Generative Language REST API. Free tier available —
 * get a key at https://aistudio.google.com/apikey
 */
export class GeminiProvider implements AiProvider {
  readonly name = 'gemini';
  get model() {
    return env.GEMINI_MODEL;
  }

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

    if (systemText && contents[0]) {
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
          // The current *-flash "latest" models are reasoning models that spend
          // output tokens on internal thinking. Keep thinking ON (disabling it
          // degrades quality) but give a high ceiling so the JSON answer fits
          // alongside the thinking budget.
          maxOutputTokens: opts.maxTokens ?? 8192,
          ...(opts.json ? { responseMimeType: 'application/json' } : {}),
        },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      // Surface the upstream status so quota/rate-limit (429) and auth (401/403)
      // errors are distinguishable from a genuine gateway failure.
      if (res.status === 429) {
        throw new AppError(
          429,
          'Gemini quota exceeded — the free-tier limit has been reached. Switch to another AI provider or add billing to your Google account.',
          body.slice(0, 500),
          'AI_QUOTA_EXCEEDED',
        );
      }
      if (res.status === 401 || res.status === 403) {
        throw new AppError(
          res.status,
          'Gemini rejected the API key. Check GEMINI_API_KEY, or switch to another AI provider.',
          body.slice(0, 500),
          'AI_AUTH',
        );
      }
      throw new AppError(502, `Gemini request failed (${res.status})`, body.slice(0, 500), 'AI_UNAVAILABLE');
    }

    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
    return { text, model: this.model };
  }
}
