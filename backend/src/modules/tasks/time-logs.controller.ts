import logger from '../../config/logger';
import { Response } from 'express';
import { validationResult } from 'express-validator';
import { AuthenticatedRequest } from '../../types';
import * as timeLogsService from './time-logs.service';
import type { CreateTimeLogDto } from './dto/create-time-log.dto';
import type { UpdateTimeLogDto } from './dto/update-time-log.dto';

// ─── GET /api/tasks/:id/time-logs ─────────────────────────────────────────────

export async function listTimeLogs(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id: ticketId } = req.params;

  try {
    // Verify task exists and check member access rights
    const task = await timeLogsService.fetchTicketAssignee(ticketId);

    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    if (req.user!.role === 'member' && task.assignee_id !== req.user!.id) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const data = await timeLogsService.listTimeLogsForTicket(ticketId);
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
  const dto = req.body as CreateTimeLogDto;

  try {
    // Verify task exists and member has access.
    // revision_count is fetched so new logs are tagged to the current cycle.
    const task = await timeLogsService.fetchTicketForTimeLogs(ticketId);

    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    if (req.user!.role === 'member' && task.assignee_id !== req.user!.id) {
      res.status(403).json({ error: 'You are not assigned to this task' });
      return;
    }

    // Time logging is only valid while actively working: in_progress or revisions
    if (!['in_progress', 'revisions'].includes(task.status)) {
      res.status(400).json({ error: 'Cannot log time on a task in this status' });
      return;
    }

    const data = await timeLogsService.createTimeLog({
      ticketId,
      userId:        req.user!.id,
      revisionCycle: task.revision_count ?? 0,
      dto,
    });

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
  const dto = req.body as UpdateTimeLogDto;

  try {
    // Verify the log exists and belongs to this task
    const log = await timeLogsService.fetchTimeLog(logId, ticketId);

    if (!log) {
      res.status(404).json({ error: 'Time log not found' });
      return;
    }

    // Members can only edit their own logs; admins can edit any
    if (req.user!.role === 'member' && log.user_id !== req.user!.id) {
      res.status(403).json({ error: 'You can only edit your own time logs' });
      return;
    }

    const data = await timeLogsService.updateTimeLog(logId, dto);
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
    const log = await timeLogsService.fetchTimeLog(logId, ticketId);

    if (!log) {
      res.status(404).json({ error: 'Time log not found' });
      return;
    }

    // Members can only delete their own non-final logs
    if (req.user!.role === 'member') {
      if (log.user_id !== req.user!.id) {
        res.status(403).json({ error: 'You can only delete your own time logs' });
        return;
      }
      if (log.log_type === 'final') {
        res.status(400).json({ error: 'Cannot delete a final time log' });
        return;
      }
    }

    await timeLogsService.deleteTimeLog(logId);
    res.status(204).send();
  } catch (err) {
    logger.error('[time-logs.controller] deleteTimeLog error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
