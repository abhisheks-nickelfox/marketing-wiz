import logger from '../config/logger';
import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import supabase, { anonClient } from '../config/supabase';
import { AuthenticatedRequest } from '../types';

// ─── Validation rules ─────────────────────────────────────────────────────────

export const loginValidation = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

export const updateProfileValidation = [
  body('name').notEmpty().withMessage('Name is required').isString(),
];

// ─── POST /api/auth/login ─────────────────────────────────────────────────────

export async function login(req: Request, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: 'Validation failed', details: errors.array() });
    return;
  }

  const { email, password } = req.body as { email: string; password: string };

  // Use the anon client — NOT the service-role client — for signInWithPassword.
  // Calling it on the service-role singleton attaches the user's JWT to its
  // internal session, causing all subsequent DB queries to run under user RLS
  // and hiding admin-owned logs (revision markers, transition logs) from members.
  const { data: authData, error: authError } = await anonClient.auth.signInWithPassword({
    email,
    password,
  });

  if (authError || !authData.session) {
    res.status(401).json({ error: authError?.message ?? 'Login failed' });
    return;
  }

  // Fetch profile
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('*')
    .eq('id', authData.user.id)
    .single();

  if (profileError || !profile) {
    res.status(500).json({ error: 'Could not load user profile' });
    return;
  }

  res.json({
    data: {
      user: profile,
      token: authData.session.access_token,
    },
  });
}

// ─── POST /api/auth/logout ────────────────────────────────────────────────────

export function logout(_req: Request, res: Response): void {
  // Supabase JWTs are stateless — the backend cannot revoke them server-side.
  // Calling supabase.auth.signOut() on the service-role client is a no-op and
  // does not invalidate the user's token. True logout must happen on the client
  // by deleting the token from localStorage (the frontend already does this).
  res.json({ message: 'Logged out successfully' });
}

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────

export async function me(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  res.json({ data: req.user });
}

// ─── PATCH /api/auth/profile ──────────────────────────────────────────────────

export async function updateProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: 'Validation failed', details: errors.array() });
    return;
  }

  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  const { name } = req.body as { name: string };

  try {
    const { data, error } = await supabase
      .from('users')
      .update({ name })
      .eq('id', req.user.id)
      .select()
      .single();

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.json({ data });
  } catch (err) {
    logger.error('[auth.controller] updateProfile error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
