// Server-side AI calls (Anthropic Claude). Imported by server.ts only — the
// API key never reaches the browser bundle.
import Anthropic from '@anthropic-ai/sdk';

export const AI_MODEL = 'claude-opus-5-5';
const MAX_TOKENS = 8000;

/** Minimal surface of the SDK client used here, so tests can pass a fake. */
export interface MessagesClient {
  messages: {
    create(params: Anthropic.MessageCreateParamsNonStreaming): Promise<Anthropic.Message>;
  };
}

export function createAIClient(apiKey: string | undefined): MessagesClient | null {
  return apiKey ? new Anthropic({ apiKey }) : null;
}

const SCRIPT_SCHEMA = {
  type: 'object',
  properties: {
    script:  { type: 'string' },
    caption: { type: 'string' },
  },
  required: ['script', 'caption'],
  additionalProperties: false,
} as const;

const SIMILARITY_SCHEMA = {
  type: 'object',
  properties: {
    similar:      { type: 'boolean' },
    matchedTopic: { type: ['string', 'null'] },
  },
  required: ['similar', 'matchedTopic'],
  additionalProperties: false,
} as const;

export function buildScriptRequest(prompt: string): Anthropic.MessageCreateParamsNonStreaming {
  return {
    model: AI_MODEL,
    max_tokens: MAX_TOKENS,
    output_config: {
      effort: 'low',
      format: { type: 'json_schema', schema: SCRIPT_SCHEMA as unknown as Record<string, unknown> },
    },
    messages: [{ role: 'user', content: prompt }],
  };
}

export function buildSimilarityRequest(prompt: string): Anthropic.MessageCreateParamsNonStreaming {
  return {
    model: AI_MODEL,
    max_tokens: MAX_TOKENS,
    output_config: {
      effort: 'low',
      format: { type: 'json_schema', schema: SIMILARITY_SCHEMA as unknown as Record<string, unknown> },
    },
    messages: [{ role: 'user', content: prompt }],
  };
}

/**
 * Runs a request and returns the parsed JSON object. Throws on refusal,
 * truncation, empty output, or unparseable JSON.
 */
export async function runJSON<T>(
  client: MessagesClient,
  params: Anthropic.MessageCreateParamsNonStreaming,
): Promise<T> {
  const response = await client.messages.create(params);

  if (response.stop_reason === 'refusal') {
    throw new Error('The AI declined this request.');
  }
  if (response.stop_reason === 'max_tokens') {
    throw new Error('The AI response was cut off before it finished.');
  }

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map(b => b.text)
    .join('');
  if (!text.trim()) throw new Error('The AI returned an empty response.');

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error('The AI returned invalid JSON.');
  }
}
