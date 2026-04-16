import logger from '../../config/logger';
import crypto from 'crypto';
import supabase from '../../config/supabase';

// ── Types ────────────────────────────────────────────────────────────────────

export interface Transcript {
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

export async function findAllTranscripts(archived?: string): Promise<Transcript[]> {
  let query = supabase
    .from('transcripts')
    .select('id, fireflies_id, title, call_date, duration_sec, participants, firm_id, archived, created_at')
    .order('call_date', { ascending: false });

  if (archived === 'true') {
    query = query.eq('archived', true);
  } else if (archived === 'false' || archived === undefined) {
    query = query.eq('archived', false);
  }
  // archived=all → no filter applied

  const { data, error } = await query;

  if (error) {
    logger.error('[transcripts.service] findAllTranscripts error:', error);
    throw new Error(error.message);
  }

  return (data ?? []) as Transcript[];
}

export async function createTranscript(dto: CreateTranscriptDto): Promise<Transcript> {
  const {
    title,
    call_date,
    raw_transcript,
    duration_sec = 0,
    participants = [],
    firm_id,
  } = dto;

  // Coerce call_date to a full ISO timestamp so TIMESTAMPTZ accepts it
  const callDateIso = call_date.includes('T') ? call_date : `${call_date}T00:00:00.000Z`;
  const fireflies_id = `manual_${crypto.randomUUID()}`;

  const { data: transcript, error } = await supabase
    .from('transcripts')
    .insert({
      fireflies_id,
      title: title.trim(),
      call_date: callDateIso,
      duration_sec: Number(duration_sec) || 0,
      participants: Array.isArray(participants) ? participants : [],
      raw_transcript: raw_transcript.trim(),
      ...(firm_id && firm_id.trim() ? { firm_id: firm_id.trim() } : {}),
      archived: false,
    })
    .select()
    .single();

  if (error) {
    logger.error('[transcripts.service] createTranscript error:', error);
    throw new Error(error.message);
  }

  return transcript as Transcript;
}

export async function toggleTranscriptArchive(id: string): Promise<Transcript | null> {
  const { data: transcript, error: fetchError } = await supabase
    .from('transcripts')
    .select('id, archived')
    .eq('id', id)
    .single();

  if (fetchError || !transcript) return null;

  const { data, error } = await supabase
    .from('transcripts')
    .update({ archived: !(transcript as { archived: boolean }).archived })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    logger.error('[transcripts.service] toggleTranscriptArchive error:', error);
    throw new Error(error.message);
  }

  return data as Transcript;
}

export async function findTranscriptForProcessing(id: string): Promise<{
  transcript: { id: string; raw_transcript: string } | null;
  wordCount: number;
}> {
  const { data: transcript, error } = await supabase
    .from('transcripts')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !transcript) return { transcript: null, wordCount: 0 };

  const rawText = (transcript.raw_transcript as string) ?? '';
  const wordCount = rawText.trim().split(/\s+/).filter(Boolean).length;

  return { transcript: transcript as { id: string; raw_transcript: string }, wordCount };
}

export async function findPromptById(promptId: string): Promise<{ system_prompt: string } | null> {
  const { data: prompt, error } = await supabase
    .from('prompts')
    .select('*')
    .eq('id', promptId)
    .single();

  if (error || !prompt) return null;

  return prompt as { system_prompt: string };
}

export async function createProcessingSession(
  transcriptId: string,
  firmId: string,
  promptId: string,
  textNotes: string,
  ticketDrafts: unknown[],
  createdBy: string
): Promise<{ id: string } | null> {
  const { data: session, error } = await supabase
    .from('processing_sessions')
    .insert({
      transcript_id: transcriptId,
      firm_id: firmId,
      prompt_id: promptId,
      text_notes: textNotes,
      ai_raw_output: { tickets: ticketDrafts },
      created_by: createdBy,
    })
    .select()
    .single();

  if (error) {
    logger.error('[transcripts.service] createProcessingSession error:', error);
    throw new Error(error.message);
  }

  return session as { id: string };
}

export async function insertTicketsFromDrafts(
  sessionId: string,
  firmId: string,
  ticketDrafts: Array<{
    title: string;
    description: string;
    type: string;
    priority: string;
  }>
): Promise<unknown[]> {
  const ticketRows = ticketDrafts.map((draft) => ({
    session_id: sessionId,
    firm_id: firmId,
    title: draft.title,
    description: draft.description,
    type: draft.type,
    priority: draft.priority,
    status: 'draft',
    ai_generated: true,
    edited: false,
    change_note: '',
  }));

  const { data: tickets, error } = await supabase
    .from('tickets')
    .insert(ticketRows)
    .select();

  if (error) {
    logger.error('[transcripts.service] insertTicketsFromDrafts error:', error);
    throw new Error(error.message);
  }

  return tickets ?? [];
}
