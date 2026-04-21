import logger from '../../config/logger';
import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { AuthenticatedRequest } from '../../types';
import * as authService from './auth.service';
import { findUserById } from '../users/users.service';
import supabase from '../../config/supabase';
import { generateResetToken, verifyResetToken } from '../../services/password-reset.service';
import { sendPasswordResetEmail } from '../../services/email.service';

const APP_URL = process.env.FRONTEND_URL?.trim() ?? 'http://localhost:5174';

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
    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (error || !user) {
      res.status(404).json({ error: 'No account found with that email address.' });
      return;
    }

    const token     = generateResetToken(email.toLowerCase().trim());
    const resetLink = `${APP_URL}/reset-password?token=${token}`;

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

    // Look up user id by email
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (userError || !user) {
      res.status(400).json({ error: 'User not found' });
      return;
    }

    // Update password via Supabase Admin API
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { password },
    );

    if (updateError) {
      res.status(400).json({ error: updateError.message });
      return;
    }

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    const e = err as Error;
    logger.error('[auth.controller] resetPassword error:', e);
    res.status(400).json({ error: e.message });
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
