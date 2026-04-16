import logger from '../../config/logger';
import { Response } from 'express';
import { validationResult } from 'express-validator';
import { AuthenticatedRequest } from '../../types';
import * as teamService from './team.service';
import type { CreateTeamMemberDto, UpdateTeamMemberDto } from './team.service';

// ─── GET /api/team ────────────────────────────────────────────────────────────

export async function listTeam(req: AuthenticatedRequest, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: errors.array()[0]?.msg ?? 'Validation failed' });
    return;
  }

  const roleFilter = req.query.role as string | undefined;

  try {
    const members = await teamService.findAllTeamMembers(roleFilter);
    res.json({ data: members });
  } catch (err) {
    logger.error('[team.controller] listTeam error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── GET /api/team/:id ────────────────────────────────────────────────────────

export async function getTeamMember(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;

  try {
    const member = await teamService.findTeamMemberById(id);

    if (!member) {
      res.status(404).json({ error: 'Team member not found' });
      return;
    }

    res.json({ data: member });
  } catch (err) {
    logger.error('[team.controller] getTeamMember error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── POST /api/team ───────────────────────────────────────────────────────────

export async function createTeamMember(req: AuthenticatedRequest, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: 'Validation failed', details: errors.array() });
    return;
  }

  try {
    const member = await teamService.createTeamMember(req.body as CreateTeamMemberDto);
    res.status(201).json({ data: member });
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    if (e.statusCode === 400) {
      res.status(400).json({ error: e.message });
      return;
    }
    logger.error('[team.controller] createTeamMember error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── PATCH /api/team/:id ──────────────────────────────────────────────────────

export async function updateTeamMember(req: AuthenticatedRequest, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: 'Validation failed', details: errors.array() });
    return;
  }

  const { id } = req.params;
  const { name, password, role, permissions } = req.body as UpdateTeamMemberDto;

  if (!name && !password && role === undefined && permissions === undefined) {
    res.status(400).json({ error: 'No updatable fields provided' });
    return;
  }

  try {
    const member = await teamService.updateTeamMember(id, { name, password, role, permissions });

    if (!member) {
      res.status(404).json({ error: 'Team member not found' });
      return;
    }

    res.json({ data: member });
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    if (e.statusCode === 400) {
      res.status(400).json({ error: e.message });
      return;
    }
    logger.error('[team.controller] updateTeamMember error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── DELETE /api/team/:id ─────────────────────────────────────────────────────
// Super-admin only. Deletes profile then Supabase Auth account.

export async function deleteTeamMember(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;

  // Prevent self-deletion
  if (req.user?.id === id) {
    res.status(400).json({ error: 'Cannot delete your own account' });
    return;
  }

  try {
    await teamService.deleteTeamMember(id);
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    logger.error('[team.controller] deleteTeamMember error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
