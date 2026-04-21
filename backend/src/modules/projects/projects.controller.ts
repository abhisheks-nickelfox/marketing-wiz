import logger from '../../config/logger';
import { Response } from 'express';
import { validationResult } from 'express-validator';
import { AuthenticatedRequest } from '../../types';
import * as projectsService from './projects.service';
import type { CreateProjectDto } from './dto/create-project.dto';
import type { UpdateProjectDto } from './dto/update-project.dto';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validateId(id: string, res: Response, label = 'ID'): boolean {
  if (!UUID_RE.test(id)) {
    res.status(400).json({ error: `Invalid ${label}` });
    return false;
  }
  return true;
}

// ─── GET /api/projects ────────────────────────────────────────────────────────

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
  if (!validateId(id, res, 'project ID')) return;

  try {
    const project = await projectsService.findProjectById(id);
    if (!project) { res.status(404).json({ error: 'Project not found' }); return; }
    res.json({ data: project });
  } catch (err) {
    logger.error('[projects.controller] getProject error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── GET /api/projects/:id/overview ──────────────────────────────────────────

export async function getProjectOverview(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;
  if (!validateId(id, res, 'project ID')) return;

  try {
    const overview = await projectsService.getProjectOverview(id);
    if (!overview) { res.status(404).json({ error: 'Project not found' }); return; }
    res.json({ data: overview });
  } catch (err) {
    logger.error('[projects.controller] getProjectOverview error:', err);
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
    if (e.statusCode === 404) { res.status(404).json({ error: e.message }); return; }
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
  if (!validateId(id, res, 'project ID')) return;

  const ALLOWED: (keyof UpdateProjectDto)[] = ['name', 'description', 'status', 'workflow_status', 'member_ids'];
  const updates: Partial<UpdateProjectDto> = {};

  for (const key of ALLOWED) {
    if (key in req.body) (updates as Record<string, unknown>)[key] = req.body[key];
  }

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: 'No updatable fields provided' });
    return;
  }

  try {
    const project = await projectsService.updateProject(id, updates);
    if (!project) { res.status(404).json({ error: 'Project not found' }); return; }
    res.json({ data: project });
  } catch (err) {
    logger.error('[projects.controller] updateProject error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── PATCH /api/projects/:id/archive ─────────────────────────────────────────

export async function archiveProject(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;
  if (!validateId(id, res, 'project ID')) return;

  try {
    const project = await projectsService.toggleProjectArchive(id);
    if (!project) { res.status(404).json({ error: 'Project not found' }); return; }
    res.json({ data: project });
  } catch (err) {
    logger.error('[projects.controller] archiveProject error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── GET /api/projects/:id/members ───────────────────────────────────────────

export async function listMembers(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;
  if (!validateId(id, res, 'project ID')) return;

  try {
    const members = await projectsService.listProjectMembers(id);
    res.json({ data: members });
  } catch (err) {
    logger.error('[projects.controller] listMembers error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── POST /api/projects/:id/members ──────────────────────────────────────────

export async function addMember(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const { user_id } = req.body as { user_id: string };

  if (!validateId(id, res, 'project ID')) return;
  if (!user_id || !UUID_RE.test(user_id)) {
    res.status(400).json({ error: 'user_id must be a valid UUID' });
    return;
  }

  try {
    await projectsService.addProjectMember(id, user_id);
    const members = await projectsService.listProjectMembers(id);
    res.status(201).json({ data: members });
  } catch (err) {
    logger.error('[projects.controller] addMember error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── DELETE /api/projects/:id/members/:userId ─────────────────────────────────

export async function removeMember(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id, userId } = req.params;

  if (!validateId(id, res, 'project ID')) return;
  if (!validateId(userId, res, 'user ID')) return;

  try {
    await projectsService.removeProjectMember(id, userId);
    const members = await projectsService.listProjectMembers(id);
    res.json({ data: members });
  } catch (err) {
    logger.error('[projects.controller] removeMember error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── DELETE /api/projects/:id ─────────────────────────────────────────────────

export async function deleteProject(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;
  if (!validateId(id, res, 'project ID')) return;

  try {
    const result = await projectsService.deleteProject(id);

    if (!result.deleted && result.hasTickets) {
      res.status(400).json({ error: 'Cannot delete a project that has tickets. Archive it instead.' });
      return;
    }

    if (!result.deleted) { res.status(404).json({ error: 'Project not found' }); return; }

    res.status(204).send();
  } catch (err) {
    logger.error('[projects.controller] deleteProject error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
