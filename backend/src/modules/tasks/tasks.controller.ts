import logger from '../../config/logger';
import { Response } from 'express';
import { validationResult } from 'express-validator';
import { AuthenticatedRequest } from '../../types';
import * as tasksService from './tasks.service';
import type { CreateTaskDto, AssignApproveDto } from './tasks.service';
import { regenerateTicket } from '../../services/ai.service';
import { Task } from '../../types';
import supabase from '../../config/supabase';
import { ADMIN_ROLES } from '../../config/constants';

// ─── POST /api/tasks ──────────────────────────────────────────────────────────

export async function createTask(req: AuthenticatedRequest, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: errors.array().map(e => e.msg).join(', '), details: errors.array() });
    return;
  }

  try {
    const ticket = await tasksService.createTask(req.body as CreateTaskDto);
    res.status(201).json({ data: ticket });
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    if (e.statusCode === 404) {
      res.status(404).json({ error: e.message });
      return;
    }
    logger.error('[tasks.controller] createTask error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── GET /api/tasks ───────────────────────────────────────────────────────────

export async function listTasks(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const enriched = await tasksService.findAllTasks({
      userId: req.user!.id,
      userRole: req.user!.role,
      userPermissions: req.user!.permissions ?? [],
      filters: req.query as Record<string, string>,
    });
    res.json({ data: enriched });
  } catch (err) {
    logger.error('[tasks.controller] listTasks error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── GET /api/tasks/:id ───────────────────────────────────────────────────────

export async function getTask(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;

  try {
    const ticket = await tasksService.findTaskById(id);

    if (!ticket) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    // Members can only see their own tasks unless they have view_all_tickets permission
    const canViewAll =
      ADMIN_ROLES.includes(req.user!.role as 'admin' | 'super_admin') ||
      (req.user!.permissions ?? []).includes('view_all_tickets');

    if (!canViewAll && (ticket as Record<string, unknown>).assignee_id !== req.user!.id) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    res.json({ data: ticket });
  } catch (err) {
    logger.error('[tasks.controller] getTask error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── PATCH /api/tasks/:id ─────────────────────────────────────────────────────

export async function updateTask(req: AuthenticatedRequest, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: 'Validation failed', details: errors.array() });
    return;
  }

  const { id } = req.params;

  try {
    const existing = await tasksService.findRawTask(id);

    if (!existing) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    // Members can only update their own tasks and only estimated_hours
    const updates: Record<string, unknown> = {};

    if (ADMIN_ROLES.includes(req.user!.role as 'admin' | 'super_admin')) {
      if (
        existing.status === 'resolved' ||
        existing.status === 'discarded' ||
        existing.status === 'closed'
      ) {
        res.status(400).json({ error: 'Cannot edit a resolved, discarded, or closed task' });
        return;
      }
      const adminFields = ['title', 'description', 'type', 'priority', 'change_note'];
      for (const f of adminFields) {
        if (f in req.body) updates[f] = (req.body as Record<string, unknown>)[f];
      }
      if (Object.keys(updates).length > 0) updates.edited = true;
    } else {
      if (existing.assignee_id !== req.user!.id) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }
      if (existing.status === 'resolved' || existing.status === 'discarded') {
        res.status(400).json({ error: 'Cannot edit a closed task' });
        return;
      }
      if ('estimated_hours' in req.body) {
        updates.estimated_hours = (req.body as Record<string, unknown>).estimated_hours;
      }
    }

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: 'No updatable fields provided' });
      return;
    }

    updates.updated_at = new Date().toISOString();

    const data = await tasksService.updateTask(id, updates);
    res.json({ data });
  } catch (err) {
    logger.error('[tasks.controller] updateTask error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── PATCH /api/tasks/:id/assign-approve ─────────────────────────────────────

export async function assignAndApprove(req: AuthenticatedRequest, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: 'Validation failed', details: errors.array() });
    return;
  }

  const { id } = req.params;

  try {
    const data = await tasksService.assignAndApproveTask(id, req.body as AssignApproveDto);

    if (!data) {
      res.status(404).json({ error: 'Task not found or not in draft status' });
      return;
    }

    res.json({ data });
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    if (e.statusCode === 400) {
      res.status(400).json({ error: e.message });
      return;
    }
    logger.error('[tasks.controller] assignAndApprove error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── PATCH /api/tasks/:id/discard ────────────────────────────────────────────

export async function discardTask(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;

  try {
    const data = await tasksService.discardTask(id);

    if (!data) {
      res.status(404).json({ error: 'Task not found or not in draft status' });
      return;
    }

    res.json({ data });
  } catch (err) {
    logger.error('[tasks.controller] discardTask error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── POST /api/tasks/:id/regenerate ──────────────────────────────────────────

export async function regenerateTaskContent(
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
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    if ((ticket as Record<string, unknown>).status !== 'draft') {
      res.status(400).json({ error: 'Only draft tasks can be regenerated' });
      return;
    }

    // Get transcript text
    let rawTranscript = '';
    const sessionData = (ticket as Record<string, unknown>).processing_sessions as { transcript_id: string } | null;

    if (sessionData?.transcript_id) {
      const { data: transcript } = await supabase
        .from('transcripts')
        .select('raw_transcript')
        .eq('id', sessionData.transcript_id)
        .single();
      rawTranscript = (transcript?.raw_transcript as string) ?? '';
    }

    const newDraft = await regenerateTicket(rawTranscript, ticket as Task, additional_instruction);

    const { data: updated, error: updateErr } = await supabase
      .from('tickets')
      .update({
        title: newDraft.title,
        description: newDraft.description,
        type: newDraft.type,
        priority: newDraft.priority,
        edited: true,
        regeneration_count: ((ticket as Record<string, unknown>).regeneration_count as number ?? 0) + 1,
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
    logger.error('[tasks.controller] regenerateTaskContent error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── PATCH /api/tasks/:id/resolve ────────────────────────────────────────────

export async function resolveTask(req: AuthenticatedRequest, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: 'Validation failed', details: errors.array() });
    return;
  }

  const { id } = req.params;
  const { final_comment = '', estimated_hours } = req.body as {
    final_comment?: string;
    estimated_hours?: number;
  };

  try {
    // Fetch ticket to verify ownership and status
    const ticket = await tasksService.findRawTask(id);

    if (!ticket) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    const isPrivileged = ADMIN_ROLES.includes(req.user!.role as 'admin' | 'super_admin');
    if (!isPrivileged && ticket.assignee_id !== req.user!.id) {
      res.status(403).json({ error: 'Only the assignee can resolve this task' });
      return;
    }

    if (!['in_progress', 'revisions'].includes(ticket.status as string)) {
      res.status(400).json({ error: 'Cannot resolve a task that is not in progress or revisions' });
      return;
    }

    const updated = await tasksService.resolveTask({
      ticketId: id,
      userId: req.user!.id,
      finalComment: final_comment,
      estimatedHours: estimated_hours,
    });

    res.json({ data: updated });
  } catch (err) {
    logger.error('[tasks.controller] resolveTask error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── DELETE /api/tasks/:id ────────────────────────────────────────────────────

export async function deleteTask(req: AuthenticatedRequest, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: errors.array().map(e => e.msg).join(', ') });
    return;
  }

  const { id } = req.params;

  try {
    const ticket = await tasksService.findRawTask(id);

    if (!ticket) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    if (ticket.status !== 'discarded') {
      res.status(400).json({ error: 'Only discarded tasks can be permanently deleted' });
      return;
    }

    await tasksService.deleteTask(id);
    res.status(200).json({ message: 'Task permanently deleted' });
  } catch (err) {
    logger.error('[tasks.controller] deleteTask error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── PATCH /api/tasks/:id/archive ────────────────────────────────────────────

export async function archiveTask(req: AuthenticatedRequest, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: 'Validation failed', details: errors.array() });
    return;
  }

  const { id } = req.params;
  const { archived } = req.body as { archived: boolean };

  try {
    const ticket = await tasksService.findRawTask(id);

    if (!ticket) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    const data = await tasksService.archiveTask(id, archived);
    res.json({ data });
  } catch (err) {
    logger.error('[tasks.controller] archiveTask error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── PATCH /api/tasks/:id/transition ─────────────────────────────────────────

export async function transitionTask(req: AuthenticatedRequest, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: 'Validation failed', details: errors.array() });
    return;
  }

  const { id } = req.params;
  const { status: targetStatus, change_note } = req.body as { status: string; change_note?: string };

  try {
    const data = await tasksService.transitionTask({
      ticketId: id,
      targetStatus,
      changeNote: change_note,
      userId: req.user!.id,
    });

    if (!data) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    res.json({ data });
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    if (e.statusCode === 400) {
      res.status(400).json({ error: e.message });
      return;
    }
    logger.error('[tasks.controller] transitionTask error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
