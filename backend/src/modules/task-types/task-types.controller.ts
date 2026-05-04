import { Response } from 'express';
import { validationResult } from 'express-validator';
import logger from '../../config/logger';
import type { AuthenticatedRequest } from '../../types';
import * as taskTypesService from './task-types.service';

export async function listTaskTypes(_req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const taskTypes = await taskTypesService.findAllTaskTypes();
    res.json({ data: taskTypes });
  } catch (err) {
    logger.error('[task-types.controller] listTaskTypes error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function createTaskType(req: AuthenticatedRequest, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: 'Validation failed', details: errors.array() });
    return;
  }

  try {
    const taskType = await taskTypesService.createTaskType(req.body);
    res.status(201).json({ data: taskType });
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    if (e.statusCode === 409) { res.status(409).json({ error: e.message }); return; }
    logger.error('[task-types.controller] createTaskType error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updateTaskType(req: AuthenticatedRequest, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: 'Validation failed', details: errors.array() });
    return;
  }

  const { id } = req.params;
  try {
    const updated = await taskTypesService.updateTaskType(id, req.body);
    res.json({ data: updated });
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    if (e.statusCode === 409) { res.status(409).json({ error: e.message }); return; }
    logger.error('[task-types.controller] updateTaskType error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function deleteTaskType(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    await taskTypesService.deleteTaskType(id);
    res.json({ message: 'Task type deleted successfully' });
  } catch (err) {
    logger.error('[task-types.controller] deleteTaskType error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
