import { Response } from 'express';
import { validationResult } from 'express-validator';
import { AuthenticatedRequest } from '../../types';
import * as usersService from './users.service';
import type { CreateUserDto } from './dto/create-user.dto';
import type { UpdateUserDto } from './dto/update-user.dto';
import { sendProfileUpdateEmail, sendInviteEmail } from '../../services/email.service';
import { generateInviteToken } from '../../services/invite.service';

// ─── GET /api/users ───────────────────────────────────────────────────────────

export async function listUsers(_req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const users = await usersService.findAllUsers();
    res.json({ data: users });
  } catch (err) {
    console.error('[users.controller] listUsers error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── GET /api/users/:id ───────────────────────────────────────────────────────

export async function getUser(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;

  try {
    const user = await usersService.findUserById(id);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json({ data: user });
  } catch (err) {
    console.error('[users.controller] getUser error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── POST /api/users ──────────────────────────────────────────────────────────

export async function createUser(req: AuthenticatedRequest, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: 'Validation failed', details: errors.array() });
    return;
  }

  try {
    const user = await usersService.createUser(req.body as CreateUserDto);

    // Send invite email for invited users (non-blocking)
    if (user.status === 'invited') {
      const frontendUrl =
        process.env.FRONTEND_URL?.trim() ?? 'http://localhost:5173';
      const token = generateInviteToken(user.id, user.email);
      const inviteLink = `${frontendUrl}/onboarding?token=${encodeURIComponent(token)}`;

      console.log(`[invite] Onboarding link for ${user.email}:\n  ${inviteLink}`);

      sendInviteEmail(user.email, user.name, inviteLink).catch((err) => {
        console.error('[users.controller] invite email failed:', err);
      });
    }

    res.status(201).json({ data: user });
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    if (e.statusCode === 400) {
      res.status(400).json({ error: e.message });
      return;
    }
    console.error('[users.controller] createUser error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── PATCH /api/users/:id ─────────────────────────────────────────────────────

export async function updateUser(req: AuthenticatedRequest, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: 'Validation failed', details: errors.array() });
    return;
  }

  const { id } = req.params;
  const dto = req.body as UpdateUserDto;

  const hasFields =
    dto.name !== undefined ||
    dto.password !== undefined ||
    dto.role !== undefined ||
    dto.member_role !== undefined ||
    dto.permissions !== undefined ||
    dto.skill_ids !== undefined ||
    dto.status !== undefined;

  if (!hasFields) {
    res.status(400).json({ error: 'No updatable fields provided' });
    return;
  }

  try {
    const user = await usersService.updateUser(id, dto);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Send notification email to the member (non-blocking — never fail the request)
    const changes: Record<string, unknown> = {};
    if (dto.name        !== undefined) changes.name        = dto.name;
    if (dto.role        !== undefined) changes.role        = dto.role;
    if (dto.member_role !== undefined) changes.member_role = dto.member_role;
    if (dto.status      !== undefined) changes.status      = dto.status;
    if (dto.skill_ids   !== undefined) changes.skills      = user.skills.map((s) => s.name);

    if (Object.keys(changes).length > 0) {
      sendProfileUpdateEmail(user.email, user.name, changes).catch((err) => {
        console.error('[users.controller] email notification failed:', err);
      });
    }

    res.json({ data: user });
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    if (e.statusCode === 400) {
      res.status(400).json({ error: e.message });
      return;
    }
    console.error('[users.controller] updateUser error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── DELETE /api/users/:id ────────────────────────────────────────────────────

export async function deleteUser(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const requesterId = req.user!.id;

  try {
    await usersService.deleteUser(id, requesterId);
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    if (e.statusCode === 400) {
      res.status(400).json({ error: e.message });
      return;
    }
    console.error('[users.controller] deleteUser error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
