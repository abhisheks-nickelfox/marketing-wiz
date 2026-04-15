import { Request, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import { verifyInviteToken } from '../services/invite.service';
import { findUserById, updateUser } from '../modules/users/users.service';
import supabase from '../config/supabase';

// ── Validation ────────────────────────────────────────────────────────────────

export const validateTokenValidation = [
  query('token').notEmpty().withMessage('token is required'),
];

export const completeOnboardingValidation = [
  body('token').notEmpty().withMessage('token is required'),
  body('name').notEmpty().trim().withMessage('name is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('password must be at least 8 characters'),
];

// ── GET /api/auth/onboarding/validate?token=… ─────────────────────────────────

export async function validateOnboardingToken(
  req: Request,
  res: Response,
): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: errors.array()[0]?.msg ?? 'Validation failed' });
    return;
  }

  const token = req.query.token as string;

  try {
    const payload = verifyInviteToken(token);

    const user = await findUserById(payload.userId);
    if (!user) {
      res.status(400).json({ error: 'User not found' });
      return;
    }
    if (user.status !== 'invited') {
      res.status(400).json({ error: 'This invite has already been used' });
      return;
    }

    res.json({ data: { email: user.email, name: user.name } });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
}

// ── POST /api/auth/onboarding/complete ────────────────────────────────────────

export async function completeOnboarding(
  req: Request,
  res: Response,
): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: errors.array()[0]?.msg ?? 'Validation failed' });
    return;
  }

  const { token, name, password } = req.body as {
    token: string;
    name: string;
    password: string;
  };

  try {
    const payload = verifyInviteToken(token);

    const user = await findUserById(payload.userId);
    if (!user) {
      res.status(400).json({ error: 'User not found' });
      return;
    }
    if (user.status !== 'invited') {
      res.status(400).json({ error: 'This invite has already been used' });
      return;
    }

    // Set password, update name, and activate the account
    await updateUser(payload.userId, {
      password,
      name: name.trim(),
      status: 'Active',
    });

    // Sign the user in and return a session token so the frontend
    // can redirect straight to the dashboard
    const { data: authData, error: signInError } =
      await supabase.auth.signInWithPassword({
        email: payload.email,
        password,
      });

    if (signInError || !authData.session) {
      // Account activated but auto-login failed — tell frontend to redirect to login
      res.json({
        data: {
          token: null,
          message: 'Account activated. Please log in.',
        },
      });
      return;
    }

    res.json({
      data: {
        token: authData.session.access_token,
        user: {
          id: payload.userId,
          email: payload.email,
          name: name.trim(),
        },
      },
    });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
}
