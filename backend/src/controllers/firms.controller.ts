import logger from '../config/logger';
import { Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import supabase from '../config/supabase';
import { AuthenticatedRequest } from '../types';

// ─── Validation ───────────────────────────────────────────────────────────────

export const createFirmValidation = [
  body('name').notEmpty().withMessage('Firm name is required'),
  body('contact_name').optional().isString(),
  body('contact_email').optional().isEmail().withMessage('Valid contact email required'),
  body('default_prompt_id').optional().isUUID('loose').withMessage('default_prompt_id must be a UUID'),
];

export const updateFirmValidation = [
  param('id').isUUID('loose').withMessage('Invalid firm ID'),
  body('name').optional().notEmpty().withMessage('Name cannot be blank'),
  body('contact_name').optional().isString(),
  body('contact_email').optional().isEmail().withMessage('Valid contact email required'),
  body('default_prompt_id').optional().isUUID('loose').withMessage('default_prompt_id must be a UUID'),
];

// ─── GET /api/firms ───────────────────────────────────────────────────────────

export async function listFirms(_req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { data: firms, error } = await supabase
      .from('firms')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    if ((firms ?? []).length === 0) {
      res.json({ data: [] });
      return;
    }

    // ISSUE-030: replaced full ticket scan in Node.js with a single view query
    const { data: statsRows, error: statsError } = await supabase
      .from('v_firm_ticket_stats')
      .select('*');

    if (statsError) {
      res.status(500).json({ error: statsError.message });
      return;
    }

    // Index view rows by firm_id for O(1) lookup
    const statsMap: Record<string, {
      total_tickets: number;
      approved_count: number;
      draft_count: number;
      last_ticket_at: string | null;
    }> = {};
    for (const row of statsRows ?? []) {
      const r = row as {
        firm_id: string;
        firm_name: string;
        total_tickets: number;
        draft_count: number;
        approved_count: number;
        resolved_count: number;
        discarded_count: number;
        total_hours_spent: number;
        last_ticket_at: string | null;
      };
      statsMap[r.firm_id] = {
        total_tickets: r.total_tickets ?? 0,
        approved_count: r.approved_count ?? 0,
        draft_count: r.draft_count ?? 0,
        last_ticket_at: r.last_ticket_at ?? null,
      };
    }

    const firmsWithStats = (firms ?? []).map((f: Record<string, unknown>) => {
      const s = statsMap[f.id as string];
      return {
        ...f,
        ticket_count: s?.total_tickets ?? 0,
        pending_count: s?.approved_count ?? 0,
        draft_count: s?.draft_count ?? 0,
        last_activity: s?.last_ticket_at ?? null,
      };
    });

    res.json({ data: firmsWithStats });
  } catch (err) {
    logger.error('[firms.controller] listFirms error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── POST /api/firms ──────────────────────────────────────────────────────────

export async function createFirm(req: AuthenticatedRequest, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: 'Validation failed', details: errors.array() });
    return;
  }

  const { name, contact_name = '', contact_email = '', default_prompt_id = null } = req.body as {
    name: string;
    contact_name?: string;
    contact_email?: string;
    default_prompt_id?: string | null;
  };

  try {
    const { data, error } = await supabase
      .from('firms')
      .insert({ name, contact_name, contact_email, default_prompt_id })
      .select()
      .single();

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.status(201).json({ data });
  } catch (err) {
    logger.error('[firms.controller] createFirm error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── GET /api/firms/:id ───────────────────────────────────────────────────────

export async function getFirm(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;

  try {
    const { data: firm, error: firmError } = await supabase
      .from('firms')
      .select('*')
      .eq('id', id)
      .single();

    if (firmError || !firm) {
      res.status(404).json({ error: 'Firm not found' });
      return;
    }

    // Fetch tickets with assignee name
    const { data: tickets, error: ticketsError } = await supabase
      .from('tickets')
      .select(
        `id, title, status, type, priority, estimated_hours, created_at, updated_at,
         assignee:users!tickets_assignee_id_fkey(id, name)`
      )
      .eq('firm_id', id)
      .order('created_at', { ascending: false });

    if (ticketsError) {
      res.status(500).json({ error: ticketsError.message });
      return;
    }

    const ticketList = tickets ?? [];
    const stats = {
      total: ticketList.length,
      draft: ticketList.filter((t: { status: string }) => t.status === 'draft').length,
      approved: ticketList.filter((t: { status: string }) => t.status === 'approved').length,
      resolved: ticketList.filter((t: { status: string }) => t.status === 'resolved').length,
    };

    res.json({ data: { ...firm, tickets: ticketList, stats } });
  } catch (err) {
    logger.error('[firms.controller] getFirm error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── PATCH /api/firms/:id ─────────────────────────────────────────────────────

export async function updateFirm(req: AuthenticatedRequest, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: 'Validation failed', details: errors.array() });
    return;
  }

  const { id } = req.params;
  const allowed = ['name', 'contact_name', 'contact_email', 'default_prompt_id'];
  const updates: Record<string, unknown> = {};

  for (const key of allowed) {
    if (key in req.body) {
      updates[key] = (req.body as Record<string, unknown>)[key];
    }
  }

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: 'No updatable fields provided' });
    return;
  }

  try {
    const { data, error } = await supabase
      .from('firms')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    if (!data) {
      res.status(404).json({ error: 'Firm not found' });
      return;
    }

    res.json({ data });
  } catch (err) {
    logger.error('[firms.controller] updateFirm error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── DELETE /api/firms/:id ────────────────────────────────────────────────────

export async function deleteFirm(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;

  // Validate UUID format before hitting the database
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    res.status(400).json({ error: 'Invalid firm ID' });
    return;
  }

  try {
    // Pre-delete existence check — Supabase delete is a no-op on missing rows
    // and would return 200 without this guard.
    const { data: existing, error: fetchErr } = await supabase
      .from('firms')
      .select('id')
      .eq('id', id)
      .single();

    if (fetchErr || !existing) {
      res.status(404).json({ error: 'Firm not found' });
      return;
    }

    const { error } = await supabase.from('firms').delete().eq('id', id);

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.json({ message: 'Firm deleted successfully' });
  } catch (err) {
    logger.error('[firms.controller] deleteFirm error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
