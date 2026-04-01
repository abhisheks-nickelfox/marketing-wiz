import { Ticket, TicketDraft, TicketType, TicketPriority } from '../types';

// Lazy-initialise Groq client (OpenAI-compatible) so the import doesn't throw when no key is set
let openaiClient: import('openai').OpenAI | null = null;

function getOpenAI(): import('openai').OpenAI | null {
  if (!process.env.GROQ_API_KEY) return null;
  if (!openaiClient) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const OpenAI = require('openai').default as typeof import('openai').OpenAI;
    openaiClient = new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: 'https://api.groq.com/openai/v1',
    });
  }
  return openaiClient;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const VALID_TYPES: TicketType[] = ['task', 'design', 'development', 'account_management'];
const VALID_PRIORITIES: TicketPriority[] = ['low', 'normal', 'high', 'urgent'];

function sanitizeTicketDraft(raw: Record<string, unknown>): TicketDraft {
  return {
    title: String(raw.title ?? 'Untitled ticket'),
    description: String(raw.description ?? ''),
    type: VALID_TYPES.includes(raw.type as TicketType)
      ? (raw.type as TicketType)
      : 'task',
    priority: VALID_PRIORITIES.includes(raw.priority as TicketPriority)
      ? (raw.priority as TicketPriority)
      : 'normal',
  };
}

function parseDraftsFromText(text: string): TicketDraft[] | null {
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]) as unknown[];
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    return parsed.map((t) => sanitizeTicketDraft(t as Record<string, unknown>));
  } catch {
    return null;
  }
}

// ─── Prompts ──────────────────────────────────────────────────────────────────

const GENERATE_SYSTEM_SUFFIX = `
Return ONLY a valid JSON array of ticket objects. Each object must have these fields:
- title (string, concise action-oriented title)
- description (string, 1–3 sentences with context)
- type (one of: task | design | development | account_management)
- priority (one of: low | normal | high | urgent)

No markdown, no explanation — just the JSON array.`;

const REGENERATE_SYSTEM_PROMPT = `You are a project management assistant.
Given a marketing call transcript, an existing ticket, and an additional instruction,
produce an improved version of the ticket.

Return ONLY a valid JSON object with these fields:
- title (string)
- description (string)
- type (one of: task | design | development | account_management)
- priority (one of: low | normal | high | urgent)

No markdown, no explanation — just the JSON object.`;

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Generate a list of ticket drafts from a transcript using Groq.
 * Throws a descriptive error if the API key is missing or the API call fails —
 * callers should surface this to the user rather than silently swallowing it.
 */
export async function generateTickets(
  transcript: string,
  systemPrompt: string,
  notes: string
): Promise<TicketDraft[]> {
  const client = getOpenAI();

  if (!client) {
    throw new Error(
      'AI service is not configured: GROQ_API_KEY is missing. ' +
      'Add it to backend/.env to enable ticket generation.'
    );
  }

  const userMessage = [
    `## Call Transcript\n${transcript}`,
    notes ? `## Additional Notes\n${notes}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');

  let text: string;
  try {
    const response = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: `${systemPrompt}\n\n${GENERATE_SYSTEM_SUFFIX}` },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });
    text = response.choices[0]?.message?.content ?? '';
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`AI service unavailable: ${message}`);
  }

  const drafts = parseDraftsFromText(text);
  if (!drafts) {
    throw new Error(
      'AI returned an unexpected response — could not parse tickets. Please try again.'
    );
  }

  return drafts;
}

/**
 * Re-generate a single ticket with an additional instruction.
 * Throws a descriptive error if the API key is missing or the API call fails.
 */
export async function regenerateTicket(
  transcript: string,
  originalTicket: Ticket,
  additionalInstruction: string
): Promise<TicketDraft> {
  const client = getOpenAI();

  if (!client) {
    throw new Error(
      'AI service is not configured: GROQ_API_KEY is missing. ' +
      'Add it to backend/.env to enable ticket regeneration.'
    );
  }

  const userMessage = [
    `## Call Transcript\n${transcript}`,
    `## Original Ticket\nTitle: ${originalTicket.title}\nDescription: ${originalTicket.description}\nType: ${originalTicket.type}\nPriority: ${originalTicket.priority}`,
    `## Additional Instruction\n${additionalInstruction}`,
  ].join('\n\n');

  let text: string;
  try {
    const response = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: REGENERATE_SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.3,
      max_tokens: 500,
    });
    text = response.choices[0]?.message?.content ?? '';
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`AI service unavailable: ${message}`);
  }

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(
      'AI returned an unexpected response — could not parse ticket. Please try again.'
    );
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
    return sanitizeTicketDraft(parsed);
  } catch {
    throw new Error(
      'AI returned malformed JSON — could not parse ticket. Please try again.'
    );
  }
}
