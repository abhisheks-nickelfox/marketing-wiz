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
  body('first_name').notEmpty().trim().withMessage('first_name is required'),
  body('last_name').notEmpty().trim().withMessage('last_name is required'),
  body('phone_number').optional().trim(),
  body('avatar_url').optional(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('password must be at least 8 characters'),
];

export const uploadAvatarValidation = [
  body('token').notEmpty().withMessage('token is required'),
  body('image')
    .notEmpty().withMessage('image is required')
    .isString().withMessage('image must be a base64 string'),
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

  const { token, first_name, last_name, phone_number, avatar_url, password } = req.body as {
    token: string;
    first_name: string;
    last_name: string;
    phone_number?: string;
    avatar_url?: string;
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

    const fullName = `${first_name.trim()} ${last_name.trim()}`.trim();

    // Set password, update name/profile fields, and activate the account
    await updateUser(payload.userId, {
      password,
      name: fullName,
      first_name: first_name.trim(),
      last_name: last_name.trim(),
      phone_number: phone_number?.trim() || undefined,
      avatar_url: avatar_url || undefined,
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
          name: fullName,
        },
      },
    });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
}

// ── POST /api/auth/onboarding/avatar ─────────────────────────────────────────

export async function uploadOnboardingAvatar(
  req: Request,
  res: Response,
): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: errors.array()[0]?.msg ?? 'Validation failed' });
    return;
  }

  const { token, image } = req.body as { token: string; image: string };

  try {
    const payload = verifyInviteToken(token);

    let finalUrl: string;

    // ── Try Supabase Storage upload ───────────────────────────────────────────
    // Falls back to storing the base64 data URL directly when the bucket does
    // not exist yet (e.g. local dev before migration 024 is applied).
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const buffer     = Buffer.from(base64Data, 'base64');

    const mimeMatch = image.match(/^data:(image\/\w+);base64,/);
    const mimeType  = (mimeMatch?.[1] ?? 'image/jpeg') as
      'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

    const ext      = mimeType.split('/')[1];
    const filePath = `${payload.userId}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, buffer, { contentType: mimeType, upsert: true });

    if (uploadError) {
      // Storage bucket not set up — store base64 data URL directly (local dev)
      console.warn('[onboarding] Storage upload failed, using data URL fallback:', uploadError.message);
      finalUrl = image; // data URL stored directly
    } else {
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);
      finalUrl = urlData.publicUrl;
    }

    await updateUser(payload.userId, { avatar_url: finalUrl });

    res.json({ data: { avatar_url: finalUrl } });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
}
