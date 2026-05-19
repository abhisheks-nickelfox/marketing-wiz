import logger from '../../config/logger';
import { Response } from 'express';
import { validationResult } from 'express-validator';
import type { AuthenticatedRequest } from '../../types';
import * as svc from './time-entries.service';
import type { CreateTimeEntryDto } from './dto/create-time-entry.dto';
import type { UpdateTimeEntryDto } from './dto/update-time-entry.dto';

// ── GET /api/tasks/:id/time-entries ──────────────────────────────────────────

export async function listEntries(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id: taskId } = req.params;
  const userId  = req.user!.id;
  const isAdmin = req.user!.role === 'admin' || req.user!.role === 'project_manager';

  try {
    const summary = await svc.listTimeEntries(taskId, userId, isAdmin);
    res.json(summary);
  } catch (err) {
    logger.error('[time-entries.controller] listEntries error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ── POST /api/tasks/:id/time-entries/start ────────────────────────────────────

export async function startTimer(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id: taskId } = req.params;

  try {
    const entry = await svc.startTimer(taskId, req.user!.id);
    res.status(201).json(entry);
  } catch (err) {
    logger.error('[time-entries.controller] startTimer error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ── PATCH /api/tasks/:id/time-entries/:entryId/stop ───────────────────────────

export async function stopTimer(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { entryId } = req.params;
  const description = typeof req.body?.description === 'string' ? req.body.description.trim() || undefined : undefined;

  try {
    const entry = await svc.stopTimer(entryId, req.user!.id, description);
    res.json(entry);
  } catch (err: unknown) {
    logger.error('[time-entries.controller] stopTimer error:', err);
    const msg    = err instanceof Error ? err.message : 'Internal server error';
    const status = (err as { statusCode?: number }).statusCode ?? 500;
    res.status(status).json({ error: msg });
  }
}

// ── POST /api/tasks/:id/time-entries ─────────────────────────────────────────

export async function createEntry(req: AuthenticatedRequest, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: 'Validation failed', details: errors.array() });
    return;
  }

  const { id: taskId } = req.params;

  try {
    const entry = await svc.createManualEntry(taskId, req.user!.id, req.body as CreateTimeEntryDto);
    res.status(201).json(entry);
  } catch (err) {
    logger.error('[time-entries.controller] createEntry error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ── PATCH /api/tasks/:id/time-entries/:entryId ────────────────────────────────

export async function updateEntry(req: AuthenticatedRequest, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: 'Validation failed', details: errors.array() });
    return;
  }

  const { entryId } = req.params;
  const isAdmin = req.user!.role === 'admin' || req.user!.role === 'project_manager';

  try {
    const entry = await svc.updateEntry(entryId, req.user!.id, isAdmin, req.body as UpdateTimeEntryDto);
    res.json(entry);
  } catch (err: unknown) {
    logger.error('[time-entries.controller] updateEntry error:', err);
    const msg    = err instanceof Error ? err.message : 'Internal server error';
    const status = (err as { statusCode?: number }).statusCode ?? 500;
    res.status(status).json({ error: msg });
  }
}

// ── DELETE /api/tasks/:id/time-entries/:entryId ───────────────────────────────

export async function deleteEntry(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { entryId } = req.params;
  const isAdmin = req.user!.role === 'admin' || req.user!.role === 'project_manager';

  try {
    await svc.deleteEntry(entryId, req.user!.id, isAdmin);
    res.status(204).send();
  } catch (err: unknown) {
    logger.error('[time-entries.controller] deleteEntry error:', err);
    const msg    = err instanceof Error ? err.message : 'Internal server error';
    const status = (err as { statusCode?: number }).statusCode ?? 500;
    res.status(status).json({ error: msg });
  }
}

// ── GET /api/projects/:id/time-entries ───────────────────────────────────────

export async function listProjectEntries(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id: projectId } = req.params;
  const userId  = req.user!.id;
  const role    = req.user!.role as string;
  const isAdmin = role === 'admin' || role === 'super_admin';

  try {
    const summary = await svc.listProjectTimeEntries(projectId, userId, isAdmin);
    res.json(summary);
  } catch (err) {
    logger.error('[time-entries.controller] listProjectEntries error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ── GET    /api/projects/:id/time-entries ─────────────────────────────────────

export async function listProjectDirectEntries(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id: projectId } = req.params;
  const userId  = req.user!.id;
  const role    = req.user!.role as string;
  const isAdmin = role === 'admin' || role === 'super_admin';

  try {
    const summary = await svc.listProjectDirectEntries(projectId, userId, isAdmin);
    res.json(summary);
  } catch (err) {
    logger.error('[time-entries.controller] listProjectDirectEntries error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ── POST   /api/projects/:id/time-entries/start ───────────────────────────────

export async function startProjectTimer(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id: projectId } = req.params;

  try {
    const entry = await svc.startProjectTimer(projectId, req.user!.id);
    res.status(201).json(entry);
  } catch (err) {
    logger.error('[time-entries.controller] startProjectTimer error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ── PATCH  /api/projects/:id/time-entries/:entryId/stop ───────────────────────

export async function stopProjectTimer(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { entryId } = req.params;
  const description = typeof req.body?.description === 'string' ? req.body.description.trim() || undefined : undefined;

  try {
    const entry = await svc.stopProjectTimer(entryId, req.user!.id, description);
    res.json(entry);
  } catch (err: unknown) {
    logger.error('[time-entries.controller] stopProjectTimer error:', err);
    const msg    = err instanceof Error ? err.message : 'Internal server error';
    const status = (err as { statusCode?: number }).statusCode ?? 500;
    res.status(status).json({ error: msg });
  }
}

// ── POST   /api/projects/:id/time-entries ─────────────────────────────────────

export async function createProjectEntry(req: AuthenticatedRequest, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: 'Validation failed', details: errors.array() });
    return;
  }

  const { id: projectId } = req.params;

  try {
    const entry = await svc.createProjectManualEntry(projectId, req.user!.id, req.body as CreateTimeEntryDto);
    res.status(201).json(entry);
  } catch (err) {
    logger.error('[time-entries.controller] createProjectEntry error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ── PATCH  /api/projects/:id/time-entries/:entryId ───────────────────────────

export async function updateProjectEntry(req: AuthenticatedRequest, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: 'Validation failed', details: errors.array() });
    return;
  }

  const { entryId } = req.params;
  const role    = req.user!.role as string;
  const isAdmin = role === 'admin' || role === 'super_admin';

  try {
    const entry = await svc.updateEntry(entryId, req.user!.id, isAdmin, req.body as UpdateTimeEntryDto);
    res.json(entry);
  } catch (err: unknown) {
    logger.error('[time-entries.controller] updateProjectEntry error:', err);
    const msg    = err instanceof Error ? err.message : 'Internal server error';
    const status = (err as { statusCode?: number }).statusCode ?? 500;
    res.status(status).json({ error: msg });
  }
}

// ── DELETE /api/projects/:id/time-entries/:entryId ────────────────────────────

export async function deleteProjectEntry(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { entryId } = req.params;
  const role    = req.user!.role as string;
  const isAdmin = role === 'admin' || role === 'super_admin';

  try {
    await svc.deleteProjectEntry(entryId, req.user!.id, isAdmin);
    res.status(204).send();
  } catch (err: unknown) {
    logger.error('[time-entries.controller] deleteProjectEntry error:', err);
    const msg    = err instanceof Error ? err.message : 'Internal server error';
    const status = (err as { statusCode?: number }).statusCode ?? 500;
    res.status(status).json({ error: msg });
  }
}

// ── GET /api/tasks/me/running-timer ──────────────────────────────────────────

export async function getRunningTimer(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const timer = await svc.getRunningTimer(req.user!.id);
    res.json(timer ?? null);
  } catch (err) {
    logger.error('[time-entries.controller] getRunningTimer error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
