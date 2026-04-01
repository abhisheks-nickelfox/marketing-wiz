import { Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import supabase from '../config/supabase';
import { regenerateTicket } from '../services/ai.service';
import { AuthenticatedRequest, Ticket } from '../types';

// ─── Validation ───────────────────────────────────────────────────────────────

export const createTicketValidation = [
  body('firm_id')
    .customSanitizer((v) => (v && typeof v === 'string' && v.trim() ? v.trim() : undefined))
    .notEmpty().withMessage('firm_id is required')
    .custom((v) => !v || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v))
    .withMessage('firm_id must be a valid UUID'),
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('type')
    .isIn(['task', 'design', 'development', 'account_management'])
    .withMessage('type must be one of: task, design, development, account_management'),
  body('priority')
    .optional()
    .isIn(['low', 'normal', 'high', 'urgent'])
    .withMessage('priority must be one of: low, normal, high, urgent'),
  body('description').optional().isString(),
];

export const updateTicketValidation = [
  param('id').isUUID('loose').withMessage('Invalid ticket ID'),
  body('title').optional().notEmpty().withMessage('Title cannot be blank'),
  body('description').optional().isString(),
  body('type')
    .optional()
    .isIn(['task', 'design', 'development', 'account_management'])
    .withMessage('Invalid type'),
  body('priority')
    .optional()
    .isIn(['low', 'normal', 'high', 'urgent'])
    .withMessage('Invalid priority'),
  body('change_note').optional().isString(),
  body('estimated_hours').optional().isFloat({ min: 0, max: 999.99 }).withMessage('Hours must be >= 0'),
];

export const assignApproveValidation = [
  param('id').isUUID('loose').withMessage('Invalid ticket ID'),
  body('assignee_id').isUUID('loose').withMessage('assignee_id must be a valid UUID'),
  body('priority')
    .optional()
    .isIn(['low', 'normal', 'high', 'urgent'])
    .withMessage('Invalid priority'),
];

export const regenerateValidation = [
  param('id').isUUID('loose').withMessage('Invalid ticket ID'),
  body('additional_instruction').optional().isString(),
];

export const resolveValidation = [
  param('id').isUUID('loose').withMessage('Invalid ticket ID'),
  body('final_comment').optional().isString(),
  body('estimated_hours').optional().isFloat({ min: 0, max: 999.99 }).withMessage('Hours must be >= 0'),
];

export const deleteTicketValidation = [
  param('id')
    .custom((v) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v))
    .withMessage('Invalid ticket ID'),
];

// ─── POST /api/tickets ────────────────────────────────────────────────────────

export async function createTicket(req: AuthenticatedRequest, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: errors.array().map(e => e.msg).join(', '), details: errors.array() });
    return;
  }

  const { firm_id, title, type, priority = 'normal', description } = req.body;

  try {
    // Verify firm exists — must be inside try/catch to handle network errors
    const { data: firm, error: firmErr } = await supabase
      .from('firms').select('id').eq('id', firm_id).single();
    if (firmErr || !firm) {
      res.status(404).json({ error: 'Firm not found' });
      return;
    }

    const { data: ticket, error } = await supabase
      .from('tickets')
      .insert({
        firm_id,
        title: title.trim(),
        type,
        priority,
        description: description?.trim() ?? null,
        session_id: null,
        ai_generated: false,
        status: 'draft',
        assignee_id: null,
        edited: false,
        change_note: '',
      })
      .select()
      .single();

    if (error) {
      console.error('[tickets.controller] createTicket error:', error);
      res.status(500).json({ error: error.message });
      return;
    }

    res.status(201).json({ data: ticket });
  } catch (err) {
    console.error('[tickets.controller] createTicket error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── GET /api/tickets ─────────────────────────────────────────────────────────

export async function listTickets(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  // Base fields shared by both admin and member queries
  const BASE_SELECT = `id, session_id, firm_id, assignee_id, title, description, type, priority, status,
       change_note, estimated_hours, ai_generated, edited, created_at, updated_at,
       firms(name),
       assignee:users!tickets_assignee_id_fkey(name, email)`;

  try {
    // Both admin and member queries include time_logs so time_spent can be shown in the list.
    const selectClause = `${BASE_SELECT}, time_logs(hours)`;

    let query = supabase
      .from('tickets')
      .select(selectClause)
      .order('created_at', { ascending: false });

    const canViewAll =
      req.user.role === 'admin' ||
      req.user.role === 'super_admin' ||
      (req.user.permissions ?? []).includes('view_all_tickets');

    if (!canViewAll) {
      // Members without view_all_tickets only see their own tickets
      query = query.eq('assignee_id', req.user.id);
    } else {
      // Admin-style filters
      const { firm_id, assignee_id, status, type, priority } = req.query as Record<string, string>;
      if (firm_id) query = query.eq('firm_id', firm_id);
      if (assignee_id) query = query.eq('assignee_id', assignee_id);
      if (status) query = query.eq('status', status);
      if (type) query = query.eq('type', type);
      if (priority) query = query.eq('priority', priority);
    }

    const { data, error } = await query;

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    // Compute time_spent (sum of time_logs.hours) per ticket and strip the raw nested array
    const enriched = (data ?? []).map((t: Record<string, unknown>) => {
      const timeLogs = t.time_logs as Array<{ hours: number }> | null;
      const time_spent = (timeLogs ?? []).reduce(
        (sum: number, l: { hours: number }) => sum + (l.hours ?? 0),
        0
      );
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { time_logs: _tl, ...rest } = t;
      return { ...rest, time_spent: Number(time_spent.toFixed(2)) };
    });

    res.json({ data: enriched });
  } catch (err) {
    console.error('[tickets.controller] listTickets error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── GET /api/tickets/:id ─────────────────────────────────────────────────────

export async function getTicket(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  const { id } = req.params;

  try {
    const { data: ticket, error } = await supabase
      .from('tickets')
      .select(
        `*, firms(name, contact_name, contact_email),
         assignee:users!tickets_assignee_id_fkey(id, name, email)`
      )
      .eq('id', id)
      .single();

    if (error || !ticket) {
      res.status(404).json({ error: 'Ticket not found' });
      return;
    }

    // Members can only see their own tickets unless they have view_all_tickets permission
    const canViewAll =
      req.user.role === 'admin' ||
      req.user.role === 'super_admin' ||
      (req.user.permissions ?? []).includes('view_all_tickets');

    if (!canViewAll && ticket.assignee_id !== req.user.id) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    res.json({ data: ticket });
  } catch (err) {
    console.error('[tickets.controller] getTicket error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── PATCH /api/tickets/:id ───────────────────────────────────────────────────

export async function updateTicket(req: AuthenticatedRequest, res: Response): Promise<void> {
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

  try {
    const { data: existing, error: fetchErr } = await supabase
      .from('tickets')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !existing) {
      res.status(404).json({ error: 'Ticket not found' });
      return;
    }

    // Members can only update their own tickets and only estimated_hours
    const updates: Record<string, unknown> = {};

    if (req.user.role === 'admin') {
      if (existing.status === 'resolved' || existing.status === 'discarded') {
        res.status(400).json({ error: 'Cannot edit a resolved or discarded ticket' });
        return;
      }
      const adminFields = ['title', 'description', 'type', 'priority', 'change_note'];
      for (const f of adminFields) {
        if (f in req.body) updates[f] = (req.body as Record<string, unknown>)[f];
      }
      if (Object.keys(updates).length > 0) updates['edited'] = true;
    } else {
      // member
      if (existing.assignee_id !== req.user.id) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }
      if (existing.status === 'resolved' || existing.status === 'discarded') {
        res.status(400).json({ error: 'Cannot edit a closed ticket' });
        return;
      }
      if ('estimated_hours' in req.body) {
        updates['estimated_hours'] = (req.body as Record<string, unknown>)['estimated_hours'];
      }
    }

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: 'No updatable fields provided' });
      return;
    }

    updates['updated_at'] = new Date().toISOString();

    const { data, error } = await supabase
      .from('tickets')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.json({ data });
  } catch (err) {
    console.error('[tickets.controller] updateTicket error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── PATCH /api/tickets/:id/assign-approve ────────────────────────────────────

export async function assignAndApprove(req: AuthenticatedRequest, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: 'Validation failed', details: errors.array() });
    return;
  }

  const { id } = req.params;
  const { assignee_id, priority, deadline } = req.body as { assignee_id: string; priority?: string; deadline?: string };

  try {
    // Verify assignee exists
    const { data: assignee, error: userErr } = await supabase
      .from('users')
      .select('id')
      .eq('id', assignee_id)
      .single();

    if (userErr || !assignee) {
      res.status(400).json({ error: 'Assignee user not found' });
      return;
    }

    const updatePayload: Record<string, unknown> = {
      assignee_id,
      status: 'approved',
      updated_at: new Date().toISOString(),
    };
    if (priority) updatePayload['priority'] = priority;
    if (deadline) updatePayload['deadline'] = deadline;

    const { data, error } = await supabase
      .from('tickets')
      .update(updatePayload)
      .eq('id', id)
      .eq('status', 'draft') // can only approve draft tickets
      .select()
      .single();

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    if (!data) {
      res.status(404).json({ error: 'Ticket not found or not in draft status' });
      return;
    }

    // Create a notification for the assignee
    await supabase.from('notifications').insert({
      user_id: assignee_id,
      title: 'New ticket assigned',
      message: data.title,
      ticket_id: data.id,
    });

    res.json({ data });
  } catch (err) {
    console.error('[tickets.controller] assignAndApprove error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── PATCH /api/tickets/:id/discard ──────────────────────────────────────────

export async function discardTicket(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from('tickets')
      .update({
        status: 'discarded',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('status', 'draft')
      .select()
      .single();

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    if (!data) {
      res.status(404).json({ error: 'Ticket not found or not in draft status' });
      return;
    }

    res.json({ data });
  } catch (err) {
    console.error('[tickets.controller] discardTicket error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── POST /api/tickets/:id/regenerate ────────────────────────────────────────

export async function regenerateTicketHandler(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: 'Validation failed', details: errors.array() });
    return;
  }

  const { id } = req.params;
  const { additional_instruction = '' } = req.body as { additional_instruction?: string };

  try {
    // Fetch ticket with its session to get the transcript
    const { data: ticket, error: ticketErr } = await supabase
      .from('tickets')
      .select('*, processing_sessions(transcript_id)')
      .eq('id', id)
      .single();

    if (ticketErr || !ticket) {
      res.status(404).json({ error: 'Ticket not found' });
      return;
    }

    if (ticket.status !== 'draft') {
      res.status(400).json({ error: 'Only draft tickets can be regenerated' });
      return;
    }

    // Get transcript text
    let rawTranscript = '';
    const sessionData = ticket.processing_sessions as { transcript_id: string } | null;
    if (sessionData?.transcript_id) {
      const { data: transcript } = await supabase
        .from('transcripts')
        .select('raw_transcript')
        .eq('id', sessionData.transcript_id)
        .single();
      rawTranscript = (transcript?.raw_transcript as string) ?? '';
    }

    const newDraft = await regenerateTicket(rawTranscript, ticket as Ticket, additional_instruction);

    const { data: updated, error: updateErr } = await supabase
      .from('tickets')
      .update({
        title: newDraft.title,
        description: newDraft.description,
        type: newDraft.type,
        priority: newDraft.priority,
        edited: true,
        regeneration_count: (ticket.regeneration_count ?? 0) + 1,
        last_regenerated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateErr) {
      res.status(500).json({ error: updateErr.message });
      return;
    }

    res.json({ data: updated });
  } catch (err) {
    console.error('[tickets.controller] regenerateTicket error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── PATCH /api/tickets/:id/resolve ──────────────────────────────────────────

export async function resolveTicket(req: AuthenticatedRequest, res: Response): Promise<void> {
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
  const { final_comment = '', estimated_hours } = req.body as {
    final_comment?: string;
    estimated_hours?: number;
  };

  try {
    // Fetch ticket to verify ownership
    const { data: ticket, error: fetchErr } = await supabase
      .from('tickets')
      .select('id, assignee_id, status')
      .eq('id', id)
      .single();

    if (fetchErr || !ticket) {
      res.status(404).json({ error: 'Ticket not found' });
      return;
    }

    if (req.user.role !== 'admin' && ticket.assignee_id !== req.user.id) {
      res.status(403).json({ error: 'Only the assignee can resolve this ticket' });
      return;
    }

    if (ticket.status !== 'approved') {
      res.status(400).json({ error: 'Only approved tickets can be resolved' });
      return;
    }

    const updates: Record<string, unknown> = {
      status: 'resolved',
      updated_at: new Date().toISOString(),
    };
    if (estimated_hours !== undefined) updates['estimated_hours'] = estimated_hours;

    const { data: updated, error: updateErr } = await supabase
      .from('tickets')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateErr) {
      res.status(500).json({ error: updateErr.message });
      return;
    }

    // Create a final time log if a comment is provided
    if (final_comment) {
      // Sum all existing (non-final) time logs so the final entry reflects actual total
      const { data: existingLogs } = await supabase
        .from('time_logs')
        .select('hours')
        .eq('ticket_id', id)
        .neq('log_type', 'final');
      const totalHours = (existingLogs ?? []).reduce(
        (sum: number, log: { hours: number }) => sum + parseFloat(String(log.hours ?? 0)),
        0
      );

      await supabase.from('time_logs').insert({
        ticket_id: id,
        user_id: req.user.id,
        hours: Number(totalHours.toFixed(2)),
        comment: final_comment,
        log_type: 'final',
      });
    }

    res.json({ data: updated });
  } catch (err) {
    console.error('[tickets.controller] resolveTicket error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── DELETE /api/tickets/:id ──────────────────────────────────────────────────

export async function deleteTicket(req: AuthenticatedRequest, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: errors.array().map(e => e.msg).join(', ') });
    return;
  }

  const { id } = req.params;

  try {
    // Fetch ticket — confirm it exists and is discarded
    const { data: ticket, error: fetchErr } = await supabase
      .from('tickets')
      .select('id, status')
      .eq('id', id)
      .single();

    if (fetchErr || !ticket) {
      res.status(404).json({ error: 'Ticket not found' });
      return;
    }

    if (ticket.status !== 'discarded') {
      res.status(400).json({ error: 'Only discarded tickets can be permanently deleted' });
      return;
    }

    // time_logs are ON DELETE CASCADE — no pre-delete needed
    const { error: deleteErr } = await supabase
      .from('tickets')
      .delete()
      .eq('id', id);

    if (deleteErr) {
      console.error('[tickets.controller] deleteTicket DB error:', deleteErr);
      res.status(500).json({ error: deleteErr.message });
      return;
    }

    res.status(200).json({ message: 'Ticket permanently deleted' });
  } catch (err) {
    console.error('[tickets.controller] deleteTicket error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
