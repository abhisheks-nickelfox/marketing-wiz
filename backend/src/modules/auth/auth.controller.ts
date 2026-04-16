import logger from '../../config/logger';
import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { AuthenticatedRequest } from '../../types';
import * as authService from './auth.service';
import { findUserById } from '../users/users.service';

// ─── POST /api/auth/login ─────────────────────────────────────────────────────

export async function login(req: Request, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: 'Validation failed', details: errors.array() });
    return;
  }

  const { email, password } = req.body as { email: string; password: string };

  try {
    const result = await authService.loginUser(email, password);
    res.json({ data: result });
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    const status = e.statusCode === 401 ? 401 : 500;
    res.status(status).json({ error: e.message });
  }
}

// ─── POST /api/auth/logout ────────────────────────────────────────────────────
// Supabase JWTs are stateless — true logout must happen on the client by
// deleting the token from localStorage. This endpoint is a no-op signal.

export function logout(_req: Request, res: Response): void {
  res.json({ message: 'Logged out successfully' });
}

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────

export async function me(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    // Return the full profile including skills (not just the req.user from middleware)
    const user = await findUserById(req.user!.id);
    if (!user) {
      res.status(401).json({ error: 'User profile not found' });
      return;
    }
    res.json({ data: user });
  } catch (err) {
    logger.error('[auth.controller] me error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── PATCH /api/auth/profile ──────────────────────────────────────────────────

export async function updateProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: 'Validation failed', details: errors.array() });
    return;
  }

  const { name } = req.body as { name: string };

  try {
    const data = await authService.updateUserProfile(req.user!.id, name);
    res.json({ data });
  } catch (err) {
    logger.error('[auth.controller] updateProfile error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
