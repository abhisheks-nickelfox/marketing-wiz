import { Response } from 'express';
import { validationResult } from 'express-validator';
import { AuthenticatedRequest } from '../../types';
import * as memberRolesService from './member-roles.service';

export async function listMemberRoles(_req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const roles = await memberRolesService.findAllMemberRoles();
    res.json({ data: roles });
  } catch (err) {
    console.error('[member-roles.controller] listMemberRoles error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function createMemberRole(req: AuthenticatedRequest, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: 'Validation failed', details: errors.array() });
    return;
  }

  try {
    const role = await memberRolesService.createMemberRole(req.body as { name: string });
    res.status(201).json({ data: role });
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    if (e.statusCode === 409) {
      res.status(409).json({ error: e.message });
      return;
    }
    console.error('[member-roles.controller] createMemberRole error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function deleteMemberRole(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    await memberRolesService.deleteMemberRole(req.params.id);
    res.json({ message: 'Member role deleted successfully' });
  } catch (err) {
    console.error('[member-roles.controller] deleteMemberRole error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
