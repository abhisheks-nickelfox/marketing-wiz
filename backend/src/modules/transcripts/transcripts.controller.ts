import logger from '../../config/logger';
import { Response } from 'express';
import { validationResult } from 'express-validator';
import { AuthenticatedRequest } from '../../types';
import * as transcriptsService from './transcripts.service';
import type { CreateTranscriptDto } from './transcripts.service';
import { syncTranscripts } from '../../services/fireflies.service';
import { generateTickets } from '../../services/ai.service';

const MIN_TRANSCRIPT_WORDS = 50;

// UUID format guard
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ─── GET /api/transcripts ─────────────────────────────────────────────────────

export async function listTranscripts(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const archived = req.query.archived as string | undefined;
    const transcripts = await transcriptsService.findAllTranscripts(archived);
    res.json({ data: transcripts });
  } catch (err) {
    logger.error('[transcripts.controller] listTranscripts error:', err);
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
    logger.error('[transcripts.controller] syncTranscripts error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── POST /api/transcripts ────────────────────────────────────────────────────

export async function createTranscript(req: AuthenticatedRequest, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.error('[transcripts.controller] createTranscript validation errors:', errors.array());
    res.status(400).json({ error: errors.array().map((e) => e.msg).join(', '), details: errors.array() });
    return;
  }

  try {
    const transcript = await transcriptsService.createTranscript(req.body as CreateTranscriptDto);
    res.status(201).json({ data: transcript });
  } catch (err) {
    logger.error('[transcripts.controller] createTranscript error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── PATCH /api/transcripts/:id/archive ──────────────────────────────────────

export async function toggleArchive(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;

  if (!UUID_RE.test(id)) {
    res.status(400).json({ error: 'Invalid transcript ID' });
    return;
  }

  try {
    const transcript = await transcriptsService.toggleTranscriptArchive(id);

    if (!transcript) {
      res.status(404).json({ error: 'Transcript not found' });
      return;
    }

    res.json({ data: transcript });
  } catch (err) {
    logger.error('[transcripts.controller] toggleArchive error:', err);
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

  const { id } = req.params;
  const { firm_id, prompt_id, text_notes = '' } = req.body as {
    firm_id: string;
    prompt_id: string;
    text_notes?: string;
  };

  try {
    // Fetch transcript and validate word count
    const { transcript, wordCount } = await transcriptsService.findTranscriptForProcessing(id);

    if (!transcript) {
      res.status(404).json({ error: 'Transcript not found' });
      return;
    }

    if (wordCount < MIN_TRANSCRIPT_WORDS) {
      res.status(400).json({
        error:
          `Transcript is too short (${wordCount} word${wordCount === 1 ? '' : 's'}). ` +
          `Minimum ${MIN_TRANSCRIPT_WORDS} words required to generate meaningful tickets.`,
      });
      return;
    }

    // Fetch prompt
    const prompt = await transcriptsService.findPromptById(prompt_id);

    if (!prompt) {
      res.status(404).json({ error: 'Prompt not found' });
      return;
    }

    // Run AI ticket generation
    const ticketDrafts = await generateTickets(
      transcript.raw_transcript,
      prompt.system_prompt,
      text_notes
    );

    // Create processing session
    const session = await transcriptsService.createProcessingSession(
      id,
      firm_id,
      prompt_id,
      text_notes,
      ticketDrafts,
      req.user!.id
    );

    if (!session) {
      res.status(500).json({ error: 'Could not create session' });
      return;
    }

    // Insert tickets
    const tickets = await transcriptsService.insertTicketsFromDrafts(session.id, firm_id, ticketDrafts);

    res.status(201).json({
      data: {
        session_id: session.id,
        firm_id,
        tickets,
      },
    });
  } catch (err) {
    logger.error('[transcripts.controller] processTranscript error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
