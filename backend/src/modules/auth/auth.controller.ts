import logger from '../../config/logger';
import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { AuthenticatedRequest } from '../../types';
import * as authService from './auth.service';
import { findUserById } from '../users/users.service';
import { User } from '../../models';
import bcrypt from 'bcrypt';
import { generateResetToken, verifyResetToken } from '../../services/password-reset.service';
import { sendPasswordResetEmail, sendPasswordChangedEmail } from '../../services/email.service';
import { FRONTEND_URL } from '../../config/constants';

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

// ─── POST /api/auth/forgot-password ──────────────────────────────────────────

export async function forgotPassword(req: Request, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: 'Validation failed', details: errors.array() });
    return;
  }

  const { email } = req.body as { email: string };

  try {
    // Look up user by email
    const user = await User.findOne({
      where: { email: email.toLowerCase().trim() },
      attributes: ['id', 'name', 'email'],
      raw: true,
    }) as { id: string; name: string; email: string } | null;

    if (!user) {
      res.status(404).json({ error: 'No account found with that email address.' });
      return;
    }

    const token     = generateResetToken(email.toLowerCase().trim());
    const resetLink = `${FRONTEND_URL}/reset-password?token=${token}`;

    await sendPasswordResetEmail(user.email, user.name ?? '', resetLink);

    logger.info(`[auth] Password reset link for ${email}: ${resetLink}`);
    res.json({ message: 'If that email exists, a reset link has been sent.' });
  } catch (err) {
    logger.error('[auth.controller] forgotPassword error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── POST /api/auth/reset-password ───────────────────────────────────────────

export async function resetPassword(req: Request, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: 'Validation failed', details: errors.array() });
    return;
  }

  const { token, password } = req.body as { token: string; password: string };

  try {
    const { email } = verifyResetToken(token);

    // Look up user by email
    const user = await User.findOne({
      where: { email },
      attributes: ['id', 'name', 'email'],
      raw: true,
    }) as { id: string; name: string; email: string } | null;

    if (!user) {
      res.status(400).json({ error: 'User not found' });
      return;
    }

    // Password is managed by Supabase Auth — no local hash stored
    sendPasswordChangedEmail(user.email, user.name ?? '').catch((err) =>
      logger.error('[auth.controller] sendPasswordChangedEmail error:', err),
    );

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    const e = err as Error;
    logger.error('[auth.controller] resetPassword error:', e);
    res.status(400).json({ error: e.message });
  }
}

// ─── POST /api/auth/change-password ──────────────────────────────────────────

export async function changePassword(req: AuthenticatedRequest, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: 'Validation failed', details: errors.array() });
    return;
  }

  const { current_password, new_password } = req.body as {
    current_password: string;
    new_password: string;
  };

  try {
    const user = req.user!;

    // Password is managed by Supabase Auth — no local hash stored
    sendPasswordChangedEmail(user.email, user.name ?? '').catch((err) =>
      logger.error('[auth.controller] sendPasswordChangedEmail error:', err),
    );

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    logger.error('[auth.controller] changePassword error:', err);
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
