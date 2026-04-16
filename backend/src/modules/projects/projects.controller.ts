import logger from '../../config/logger';
import { Response } from 'express';
import { validationResult } from 'express-validator';
import { AuthenticatedRequest } from '../../types';
import * as projectsService from './projects.service';
import type { CreateProjectDto, UpdateProjectDto } from './projects.service';

// UUID format guard
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ─── GET /api/projects?firm_id=X ─────────────────────────────────────────────

export async function listProjects(req: AuthenticatedRequest, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: errors.array()[0]?.msg ?? 'Validation failed' });
    return;
  }

  const { firm_id } = req.query as Record<string, string>;

  try {
    const projects = await projectsService.findAllProjects(firm_id);
    res.json({ data: projects });
  } catch (err) {
    logger.error('[projects.controller] listProjects error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── GET /api/projects/:id ────────────────────────────────────────────────────

export async function getProject(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;

  if (!UUID_RE.test(id)) {
    res.status(400).json({ error: 'Invalid project ID' });
    return;
  }

  try {
    const project = await projectsService.findProjectById(id);

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    res.json({ data: project });
  } catch (err) {
    logger.error('[projects.controller] getProject error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── POST /api/projects ───────────────────────────────────────────────────────

export async function createProject(req: AuthenticatedRequest, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: errors.array()[0]?.msg ?? 'Validation failed' });
    return;
  }

  try {
    const project = await projectsService.createProject(req.body as CreateProjectDto);
    res.status(201).json({ data: project });
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    if (e.statusCode === 404) {
      res.status(404).json({ error: e.message });
      return;
    }
    logger.error('[projects.controller] createProject error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── PATCH /api/projects/:id ──────────────────────────────────────────────────

export async function updateProject(req: AuthenticatedRequest, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: errors.array()[0]?.msg ?? 'Validation failed' });
    return;
  }

  const { id } = req.params;

  if (!UUID_RE.test(id)) {
    res.status(400).json({ error: 'Invalid project ID' });
    return;
  }

  const ALLOWED = ['name', 'description', 'status'] as const;
  const updates: Partial<UpdateProjectDto> = {};

  for (const key of ALLOWED) {
    if (key in req.body) {
      (updates as Record<string, unknown>)[key] = (req.body as Record<string, unknown>)[key];
    }
  }

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: 'No updatable fields provided' });
    return;
  }

  try {
    const project = await projectsService.updateProject(id, updates);

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    res.json({ data: project });
  } catch (err) {
    logger.error('[projects.controller] updateProject error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── PATCH /api/projects/:id/archive ─────────────────────────────────────────

export async function archiveProject(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;

  if (!UUID_RE.test(id)) {
    res.status(400).json({ error: 'Invalid project ID' });
    return;
  }

  try {
    const project = await projectsService.toggleProjectArchive(id);

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    res.json({ data: project });
  } catch (err) {
    logger.error('[projects.controller] archiveProject error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── DELETE /api/projects/:id ─────────────────────────────────────────────────

export async function deleteProject(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;

  if (!UUID_RE.test(id)) {
    res.status(400).json({ error: 'Invalid project ID' });
    return;
  }

  try {
    const result = await projectsService.deleteProject(id);

    if (!result.deleted && result.hasTickets) {
      res.status(400).json({
        error: 'Cannot delete project with existing tickets. Archive it instead.',
      });
      return;
    }

    if (!result.deleted) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    res.status(204).send();
  } catch (err) {
    logger.error('[projects.controller] deleteProject error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
