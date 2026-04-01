import { Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import supabase from '../config/supabase';
import { AuthenticatedRequest } from '../types';

// ─── Validation ───────────────────────────────────────────────────────────────

export const createTimeLogValidation = [
  param('id').isUUID('loose').withMessage('Invalid ticket ID'),
  body('hours').isFloat({ min: 0.01 }).withMessage('Hours must be a positive number'),
  body('comment').optional().isString(),
  body('log_type')
    .isIn(['estimate', 'partial', 'final'])
    .withMessage('log_type must be estimate | partial | final'),
];

// ─── GET /api/tickets/:id/time-logs ──────────────────────────────────────────

export async function listTimeLogs(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  const { id: ticketId } = req.params;

  try {
    // Verify ticket exists (and access rights for members)
    const { data: ticket, error: ticketErr } = await supabase
      .from('tickets')
      .select('id, assignee_id')
      .eq('id', ticketId)
      .single();

    if (ticketErr || !ticket) {
      res.status(404).json({ error: 'Ticket not found' });
      return;
    }

    if (req.user.role === 'member' && ticket.assignee_id !== req.user.id) {
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
    console.error('[timeLogs.controller] listTimeLogs error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── PATCH /api/tickets/:id/time-logs/:logId ─────────────────────────────────

export const updateTimeLogValidation = [
  param('id').isUUID('loose').withMessage('Invalid ticket ID'),
  param('logId').isUUID('loose').withMessage('Invalid log ID'),
  body('hours').isFloat({ min: 0.01, max: 999.99 }).withMessage('Hours must be between 0.01 and 999.99'),
  body('comment').optional().isString(),
];

export async function updateTimeLog(req: AuthenticatedRequest, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: 'Validation failed', details: errors.array() });
    return;
  }

  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' });
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
    if (req.user.role === 'member' && log.user_id !== req.user.id) {
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
    console.error('[timeLogs.controller] updateTimeLog error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── DELETE /api/tickets/:id/time-logs/:logId ────────────────────────────────

export const deleteTimeLogValidation = [
  param('id').isUUID('loose').withMessage('Invalid ticket ID'),
  param('logId').isUUID('loose').withMessage('Invalid log ID'),
];

export async function deleteTimeLog(req: AuthenticatedRequest, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: 'Validation failed', details: errors.array() });
    return;
  }

  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' });
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

    // Members can only delete their own non-final logs
    if (req.user.role === 'member') {
      if (log.user_id !== req.user.id) {
        res.status(403).json({ error: 'You can only delete your own time logs' });
        return;
      }
      if (log.log_type === 'final') {
        res.status(400).json({ error: 'Cannot delete a final time log' });
        return;
      }
    }

    const { error } = await supabase
      .from('time_logs')
      .delete()
      .eq('id', logId);

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.status(204).send();
  } catch (err) {
    console.error('[timeLogs.controller] deleteTimeLog error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── POST /api/tickets/:id/time-logs ─────────────────────────────────────────

export async function createTimeLog(req: AuthenticatedRequest, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: 'Validation failed', details: errors.array() });
    return;
  }

  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  const { id: ticketId } = req.params;
  const { hours, comment = '', log_type } = req.body as {
    hours: number;
    comment?: string;
    log_type: 'estimate' | 'partial' | 'final';
  };

  try {
    // Verify ticket exists and member has access
    const { data: ticket, error: ticketErr } = await supabase
      .from('tickets')
      .select('id, assignee_id, status')
      .eq('id', ticketId)
      .single();

    if (ticketErr || !ticket) {
      res.status(404).json({ error: 'Ticket not found' });
      return;
    }

    if (req.user.role === 'member' && ticket.assignee_id !== req.user.id) {
      res.status(403).json({ error: 'You are not assigned to this ticket' });
      return;
    }

    // Draft tickets have no assignee yet; discarded tickets are closed.
    // Time logging is only valid on approved (or resolved) tickets.
    if (ticket.status === 'draft' || ticket.status === 'discarded') {
      res.status(400).json({ error: 'Cannot log time on a ticket that is not approved' });
      return;
    }

    const { data, error } = await supabase
      .from('time_logs')
      .insert({
        ticket_id: ticketId,
        user_id: req.user.id,
        hours,
        comment,
        log_type,
      })
      .select()
      .single();

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.status(201).json({ data });
  } catch (err) {
    console.error('[timeLogs.controller] createTimeLog error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
