import { Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import crypto from 'crypto';
import supabase from '../config/supabase';
import { syncTranscripts } from '../services/fireflies.service';
import { generateTickets } from '../services/ai.service';
import { AuthenticatedRequest } from '../types';

// ─── Validation ───────────────────────────────────────────────────────────────

const MIN_TRANSCRIPT_WORDS = 50;

export const createTranscriptValidation = [
  body('title').trim().notEmpty().withMessage('title is required'),
  body('call_date').trim().notEmpty().withMessage('call_date is required'),
  body('raw_transcript')
    .trim()
    .notEmpty().withMessage('raw_transcript is required')
    .custom((v: string) => {
      const wordCount = v.trim().split(/\s+/).filter(Boolean).length;
      if (wordCount < MIN_TRANSCRIPT_WORDS) {
        throw new Error(
          `Transcript is too short (${wordCount} word${wordCount === 1 ? '' : 's'}). ` +
          `Minimum ${MIN_TRANSCRIPT_WORDS} words required to generate meaningful tickets.`
        );
      }
      return true;
    }),
  body('duration_sec')
    .optional({ nullable: true })
    .customSanitizer((v) => (v === '' || v === null || v === undefined ? 0 : Number(v)))
    .isFloat({ min: 0 })
    .withMessage('duration_sec must be a non-negative number'),
  body('participants')
    .optional({ nullable: true })
    .customSanitizer((v) => (Array.isArray(v) ? v : []))
    .isArray()
    .withMessage('participants must be an array'),
  body('firm_id')
    .customSanitizer((v) => (v && typeof v === 'string' && v.trim() ? v.trim() : undefined))
    .optional()
    .custom((v) => !v || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v))
    .withMessage('firm_id must be a valid UUID'),
];

export const processValidation = [
  param('id').isUUID('loose').withMessage('Invalid transcript ID'),
  body('firm_id').isUUID('loose').withMessage('firm_id must be a valid UUID'),
  body('prompt_id').isUUID('loose').withMessage('prompt_id must be a valid UUID'),
  body('text_notes').optional().isString(),
];

// ─── GET /api/transcripts ─────────────────────────────────────────────────────

export async function listTranscripts(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const archived = req.query.archived;

    let query = supabase
      .from('transcripts')
      .select('id, fireflies_id, title, call_date, duration_sec, participants, firm_id, archived, created_at')
      .order('call_date', { ascending: false });

    if (archived === 'true') {
      query = query.eq('archived', true);
    } else if (archived === 'false' || archived === undefined) {
      query = query.eq('archived', false);
    }
    // archived=all → no filter

    const { data, error } = await query;

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.json({ data });
  } catch (err) {
    console.error('[transcripts.controller] listTranscripts error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── POST /api/transcripts/sync ───────────────────────────────────────────────

export async function syncTranscriptsHandler(
  _req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const result = await syncTranscripts();
    res.json({ data: result });
  } catch (err) {
    console.error('[transcripts.controller] syncTranscripts error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── POST /api/transcripts ───────────────────────────────────────────────────

export async function createTranscript(req: AuthenticatedRequest, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.error('[transcripts.controller] createTranscript validation errors:', errors.array());
    res.status(400).json({ error: errors.array().map((e) => e.msg).join(', '), details: errors.array() });
    return;
  }

  const {
    title,
    call_date,
    duration_sec = 0,
    participants = [],
    raw_transcript,
    firm_id,
  } = req.body as {
    title: string;
    call_date: string;
    duration_sec?: number;
    participants?: string[];
    raw_transcript: string;
    firm_id?: string;
  };

  // Coerce call_date to a full ISO timestamp so TIMESTAMPTZ accepts it
  const callDateIso = call_date.includes('T') ? call_date : `${call_date}T00:00:00.000Z`;
  const fireflies_id = `manual_${crypto.randomUUID()}`;

  try {
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
      console.error('[transcripts.controller] createTranscript DB error:', error);
      res.status(500).json({ error: error.message });
      return;
    }

    res.status(201).json({ data: transcript });
  } catch (err) {
    console.error('[transcripts.controller] createTranscript error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── PATCH /api/transcripts/:id/archive ──────────────────────────────────────

export async function toggleArchive(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;

  // Validate UUID format — mirrors the check used by all other handlers in this file
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    res.status(400).json({ error: 'Invalid transcript ID' });
    return;
  }

  try {
    // Fetch current state
    const { data: transcript, error: fetchError } = await supabase
      .from('transcripts')
      .select('id, archived')
      .eq('id', id)
      .single();

    if (fetchError || !transcript) {
      res.status(404).json({ error: 'Transcript not found' });
      return;
    }

    const { data, error } = await supabase
      .from('transcripts')
      .update({ archived: !transcript.archived })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.json({ data });
  } catch (err) {
    console.error('[transcripts.controller] toggleArchive error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── POST /api/transcripts/:id/process ───────────────────────────────────────

export async function processTranscript(req: AuthenticatedRequest, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: 'Validation failed', details: errors.array() });
    return;
  }

  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  const { id } = req.params;
  const { firm_id, prompt_id, text_notes = '' } = req.body as {
    firm_id: string;
    prompt_id: string;
    text_notes?: string;
  };

  try {
    // Fetch transcript
    const { data: transcript, error: tErr } = await supabase
      .from('transcripts')
      .select('*')
      .eq('id', id)
      .single();

    if (tErr || !transcript) {
      res.status(404).json({ error: 'Transcript not found' });
      return;
    }

    // Word count guard — applies to both manual and Fireflies-synced transcripts
    const rawText = (transcript.raw_transcript as string) ?? '';
    const wordCount = rawText.trim().split(/\s+/).filter(Boolean).length;
    if (wordCount < MIN_TRANSCRIPT_WORDS) {
      res.status(400).json({
        error:
          `Transcript is too short (${wordCount} word${wordCount === 1 ? '' : 's'}). ` +
          `Minimum ${MIN_TRANSCRIPT_WORDS} words required to generate meaningful tickets.`,
      });
      return;
    }

    // Fetch prompt
    const { data: prompt, error: pErr } = await supabase
      .from('prompts')
      .select('*')
      .eq('id', prompt_id)
      .single();

    if (pErr || !prompt) {
      res.status(404).json({ error: 'Prompt not found' });
      return;
    }

    // Run AI
    const ticketDrafts = await generateTickets(
      transcript.raw_transcript as string,
      prompt.system_prompt as string,
      text_notes
    );

    // Create processing session
    const { data: session, error: sessionErr } = await supabase
      .from('processing_sessions')
      .insert({
        transcript_id: id,
        firm_id,
        prompt_id,
        text_notes,
        ai_raw_output: { tickets: ticketDrafts },
        created_by: req.user.id,
      })
      .select()
      .single();

    if (sessionErr || !session) {
      res.status(500).json({ error: sessionErr?.message ?? 'Could not create session' });
      return;
    }

    // Insert tickets
    const ticketRows = ticketDrafts.map((draft) => ({
      session_id: session.id,
      firm_id,
      title: draft.title,
      description: draft.description,
      type: draft.type,
      priority: draft.priority,
      status: 'draft',
      ai_generated: true,
      edited: false,
      change_note: '',
    }));

    const { data: tickets, error: ticketErr } = await supabase
      .from('tickets')
      .insert(ticketRows)
      .select();

    if (ticketErr) {
      res.status(500).json({ error: ticketErr.message });
      return;
    }

    res.status(201).json({
      data: {
        session_id: session.id,
        firm_id,
        tickets: tickets ?? [],
      },
    });
  } catch (err) {
    console.error('[transcripts.controller] processTranscript error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
