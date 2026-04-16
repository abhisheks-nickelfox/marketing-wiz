import logger from '../../config/logger';
import { Response } from 'express';
import { validationResult } from 'express-validator';
import supabase from '../../config/supabase';
import { AuthenticatedRequest } from '../../types';

// ─── GET /api/tasks/:id/time-logs ─────────────────────────────────────────────

export async function listTimeLogs(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id: ticketId } = req.params;

  try {
    // Verify ticket exists and check member access rights
    const { data: ticket, error: ticketErr } = await supabase
      .from('tickets')
      .select('id, assignee_id')
      .eq('id', ticketId)
      .single();

    if (ticketErr || !ticket) {
      res.status(404).json({ error: 'Ticket not found' });
      return;
    }

    if (req.user!.role === 'member' && (ticket as { assignee_id: string }).assignee_id !== req.user!.id) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const { data, error } = await supabase
      .from('time_logs')
      .select('*, users(name, email)')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: false });

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.json({ data });
  } catch (err) {
    logger.error('[time-logs.controller] listTimeLogs error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── POST /api/tasks/:id/time-logs ────────────────────────────────────────────

export async function createTimeLog(req: AuthenticatedRequest, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: 'Validation failed', details: errors.array() });
    return;
  }

  const { id: ticketId } = req.params;
  const { hours, comment = '', log_type } = req.body as {
    hours: number;
    comment?: string;
    log_type: 'estimate' | 'partial' | 'final' | 'revision';
  };

  try {
    // Verify ticket exists and member has access.
    // revision_count is fetched so new logs are tagged to the current cycle.
    const { data: ticket, error: ticketErr } = await supabase
      .from('tickets')
      .select('id, assignee_id, status, revision_count')
      .eq('id', ticketId)
      .single();

    if (ticketErr || !ticket) {
      res.status(404).json({ error: 'Ticket not found' });
      return;
    }

    const t = ticket as { assignee_id: string; status: string; revision_count: number };

    if (req.user!.role === 'member' && t.assignee_id !== req.user!.id) {
      res.status(403).json({ error: 'You are not assigned to this ticket' });
      return;
    }

    // Time logging is only valid while actively working: in_progress or revisions
    if (!['in_progress', 'revisions'].includes(t.status)) {
      res.status(400).json({ error: 'Cannot log time on a ticket in this status' });
      return;
    }

    const { data, error } = await supabase
      .from('time_logs')
      .insert({
        ticket_id: ticketId,
        user_id: req.user!.id,
        hours,
        comment,
        log_type,
        // Tag every log with the current revision cycle for time history grouping.
        // cycle 0 = initial work; cycle N = after the Nth revisions transition.
        revision_cycle: t.revision_count ?? 0,
      })
      .select()
      .single();

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.status(201).json({ data });
  } catch (err) {
    logger.error('[time-logs.controller] createTimeLog error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── PATCH /api/tasks/:id/time-logs/:logId ────────────────────────────────────

export async function updateTimeLog(req: AuthenticatedRequest, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: 'Validation failed', details: errors.array() });
    return;
  }

  const { id: ticketId, logId } = req.params;
  const { hours, comment } = req.body as { hours: number; comment?: string };

  try {
    // Verify the log exists and belongs to this ticket
    const { data: log, error: logErr } = await supabase
      .from('time_logs')
      .select('id, user_id, ticket_id')
      .eq('id', logId)
      .eq('ticket_id', ticketId)
      .single();

    if (logErr || !log) {
      res.status(404).json({ error: 'Time log not found' });
      return;
    }

    // Members can only edit their own logs; admins can edit any
    if (req.user!.role === 'member' && (log as { user_id: string }).user_id !== req.user!.id) {
      res.status(403).json({ error: 'You can only edit your own time logs' });
      return;
    }

    const updatePayload: Record<string, unknown> = { hours };
    if (comment !== undefined) updatePayload.comment = comment;

    const { data, error } = await supabase
      .from('time_logs')
      .update(updatePayload)
      .eq('id', logId)
      .select()
      .single();

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.json({ data });
  } catch (err) {
    logger.error('[time-logs.controller] updateTimeLog error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── DELETE /api/tasks/:id/time-logs/:logId ───────────────────────────────────

export async function deleteTimeLog(req: AuthenticatedRequest, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: 'Validation failed', details: errors.array() });
    return;
  }

  const { id: ticketId, logId } = req.params;

  try {
    const { data: log, error: logErr } = await supabase
      .from('time_logs')
      .select('id, user_id, ticket_id, log_type')
      .eq('id', logId)
      .eq('ticket_id', ticketId)
      .single();

    if (logErr || !log) {
      res.status(404).json({ error: 'Time log not found' });
      return;
    }

    const l = log as { user_id: string; log_type: string };

    // Members can only delete their own non-final logs
    if (req.user!.role === 'member') {
      if (l.user_id !== req.user!.id) {
        res.status(403).json({ error: 'You can only delete your own time logs' });
        return;
      }
      if (l.log_type === 'final') {
        res.status(400).json({ error: 'Cannot delete a final time log' });
        return;
      }
    }

    const { error } = await supabase.from('time_logs').delete().eq('id', logId);

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.status(204).send();
  } catch (err) {
    logger.error('[time-logs.controller] deleteTimeLog error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
