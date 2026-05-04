import logger from '../../config/logger';
import crypto from 'crypto';
import { Transcript, Prompt, ProcessingSession, Ticket } from '../../models';

// ── Types ────────────────────────────────────────────────────────────────────

export interface TranscriptRow {
  id: string;
  fireflies_id: string;
  title: string;
  call_date: string;
  duration_sec: number;
  participants: string[];
  firm_id: string | null;
  archived: boolean;
  created_at: string;
}

export interface CreateTranscriptDto {
  title: string;
  call_date: string;
  raw_transcript: string;
  duration_sec?: number;
  participants?: string[];
  firm_id?: string;
}

export interface ProcessTranscriptDto {
  firm_id: string;
  prompt_id: string;
  text_notes?: string;
}

// ── Service methods ──────────────────────────────────────────────────────────

export async function findAllTranscripts(archived?: string): Promise<TranscriptRow[]> {
  const where: Record<string, unknown> = {};

  if (archived === 'true') {
    where.archived = true;
  } else if (archived === 'false' || archived === undefined) {
    where.archived = false;
  }
  // archived=all → no filter

  const rows = await Transcript.findAll({
    where,
    attributes: ['id', 'fireflies_id', 'title', 'call_date', 'duration_sec', 'participants', 'firm_id', 'archived', 'created_at'],
    order: [['call_date', 'DESC']],
    raw: true,
  });

  return rows as unknown as TranscriptRow[];
}

export async function createTranscript(dto: CreateTranscriptDto): Promise<TranscriptRow> {
  const {
    title,
    call_date,
    raw_transcript,
    duration_sec = 0,
    participants = [],
    firm_id,
  } = dto;

  // Coerce call_date to a full ISO timestamp
  const callDateIso = call_date.includes('T') ? call_date : `${call_date}T00:00:00.000Z`;
  const fireflies_id = `manual_${crypto.randomUUID()}`;

  const row = await Transcript.create({
    fireflies_id,
    title:          title.trim(),
    call_date:      callDateIso,
    duration_sec:   Number(duration_sec) || 0,
    participants:   Array.isArray(participants) ? participants : [],
    raw_transcript: raw_transcript.trim(),
    firm_id:        firm_id?.trim() || null,
    archived:       false,
  });

  return row.toJSON() as TranscriptRow;
}

export async function toggleTranscriptArchive(id: string): Promise<TranscriptRow | null> {
  const transcript = await Transcript.findByPk(id, {
    attributes: ['id', 'archived'],
    raw: true,
  });

  if (!transcript) return null;

  const current = (transcript as unknown as { archived: boolean }).archived;
  await Transcript.update({ archived: !current }, { where: { id } });

  const updated = await Transcript.findByPk(id, { raw: true });
  return updated ? (updated as unknown as TranscriptRow) : null;
}

export async function findTranscriptForProcessing(id: string): Promise<{
  transcript: { id: string; raw_transcript: string } | null;
  wordCount: number;
}> {
  const transcript = await Transcript.findByPk(id, { raw: true });

  if (!transcript) return { transcript: null, wordCount: 0 };

  const rawText = (transcript as unknown as { raw_transcript: string }).raw_transcript ?? '';
  const wordCount = rawText.trim().split(/\s+/).filter(Boolean).length;

  return { transcript: transcript as unknown as { id: string; raw_transcript: string }, wordCount };
}

export async function findPromptById(promptId: string): Promise<{ system_prompt: string } | null> {
  const prompt = await Prompt.findByPk(promptId, { raw: true });
  return prompt ? (prompt as unknown as { system_prompt: string }) : null;
}

export async function createProcessingSession(
  transcriptId: string,
  firmId: string,
  promptId: string,
  textNotes: string,
  taskDrafts: unknown[],
  createdBy: string,
): Promise<{ id: string } | null> {
  try {
    const session = await ProcessingSession.create({
      transcript_id:  transcriptId,
      firm_id:        firmId,
      prompt_id:      promptId,
      text_notes:     textNotes,
      ai_raw_output:  { tasks: taskDrafts },
      created_by:     createdBy,
    });

    return { id: session.id };
  } catch (err) {
    logger.error('[transcripts.service] createProcessingSession error:', err);
    throw err;
  }
}

export async function insertTicketsFromDrafts(
  sessionId: string,
  firmId: string,
  taskDrafts: Array<{
    title: string;
    description: string;
    type: string;
    priority: string;
  }>,
): Promise<unknown[]> {
  const taskRows = taskDrafts.map((draft) => ({
    session_id:    sessionId,
    firm_id:       firmId,
    title:         draft.title,
    description:   draft.description,
    type:          draft.type,
    priority:      draft.priority,
    status:        'to_do',
    ai_generated:  true,
    edited:        false,
    change_note:   '',
  }));

  try {
    const tickets = await Ticket.bulkCreate(taskRows, { returning: true });
    return tickets.map((t) => t.toJSON());
  } catch (err) {
    logger.error('[transcripts.service] insertTicketsFromDrafts error:', err);
    throw err;
  }
}
