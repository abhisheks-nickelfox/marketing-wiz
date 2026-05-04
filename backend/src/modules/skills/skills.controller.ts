import logger from '../../config/logger';
import { Response } from 'express';
import { validationResult } from 'express-validator';
import { AuthenticatedRequest } from '../../types';
import * as skillsService from './skills.service';

// ─── GET /api/skills ──────────────────────────────────────────────────────────

export async function listSkills(_req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const skills = await skillsService.findAllSkills();
    res.json({ data: skills });
  } catch (err) {
    logger.error('[skills.controller] listSkills error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── POST /api/skills ─────────────────────────────────────────────────────────

export async function createSkill(req: AuthenticatedRequest, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: 'Validation failed', details: errors.array() });
    return;
  }

  try {
    const skill = await skillsService.createSkill(req.body);
    res.status(201).json({ data: skill });
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    if (e.statusCode === 409) {
      res.status(409).json({ error: e.message });
      return;
    }
    logger.error('[skills.controller] createSkill error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
export async function updateSkill(req: AuthenticatedRequest, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: 'Validation failed', details: errors.array() });
    return;
  }

  const { id } = req.params;

  try {
    const updated = await skillsService.updateSkill(id, req.body);
    res.json({ data: updated });
  } catch (err) {
    logger.error('[skills.controller] updateSkill error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
// ─── PUT /api/skills/:id/members ─────────────────────────────────────────────

export async function setSkillMembers(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const { user_ids } = req.body;

  if (!Array.isArray(user_ids)) {
    res.status(400).json({ error: 'user_ids must be an array' });
    return;
  }

  try {
    await skillsService.setSkillMembers(id, user_ids);
    res.json({ message: 'Skill members updated' });
  } catch (err) {
    logger.error('[skills.controller] setSkillMembers error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── DELETE /api/skills/:id ───────────────────────────────────────────────────

export async function deleteSkill(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;

  try {
    await skillsService.deleteSkill(id);
    res.json({ message: 'Skill deleted successfully' });
  } catch (err) {
    logger.error('[skills.controller] deleteSkill error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
