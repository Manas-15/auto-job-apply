export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GenerateOptions {
  /** Lower = more deterministic. Defaults per provider. */
  temperature?: number;
  maxTokens?: number;
  /** Ask the provider to return strict JSON when supported. */
  json?: boolean;
}

export interface AiResult {
  text: string;
  model: string;
}

/**
 * A provider-agnostic LLM interface. Every backend (Gemini, Ollama,
 * OpenAI, Anthropic) implements this so the rest of the app never
 * cares which model is behind it.
 */
export interface AiProvider {
  readonly name: string;
  readonly model: string;
  generate(messages: ChatMessage[], opts?: GenerateOptions): Promise<AiResult>;
}
