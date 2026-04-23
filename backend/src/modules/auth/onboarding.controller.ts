import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import * as onboardingService from './onboarding.service';
import type { CompleteOnboardingDto } from './dto/complete-onboarding.dto';

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
    const result = await onboardingService.validateOnboardingToken(token);
    res.json({ data: result });
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    res.status(e.statusCode ?? 400).json({ error: e.message });
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

  try {
    const result = await onboardingService.completeOnboarding(req.body as CompleteOnboardingDto);
    res.json({ data: result });
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    res.status(e.statusCode ?? 400).json({ error: e.message });
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
    const result = await onboardingService.uploadOnboardingAvatar(token, image);
    res.json({ data: result });
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    res.status(e.statusCode ?? 400).json({ error: e.message });
  }
}
