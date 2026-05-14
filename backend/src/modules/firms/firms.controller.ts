import logger from '../../config/logger';
import { Response } from 'express';
import { validationResult } from 'express-validator';
import { AuthenticatedRequest } from '../../types';
import * as firmsService from './firms.service';
import type { CreateFirmDto, UpdateFirmDto } from './firms.service';
import { uploadBase64Image } from '../../config/storage';

// UUID format guard
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ─── GET /api/firms ───────────────────────────────────────────────────────────

export async function listFirms(req: AuthenticatedRequest, res: Response): Promise<void> {
  const page  = Math.max(1, parseInt((req.query.page  as string) ?? '1',  10) || 1);
  const limit = Math.max(1, parseInt((req.query.limit as string) ?? '50', 10) || 50);

  try {
    const result = await firmsService.findAllFirms(page, limit);
    res.json(result);
  } catch (err) {
    logger.error('[firms.controller] listFirms error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── POST /api/firms ──────────────────────────────────────────────────────────

export async function createFirm(req: AuthenticatedRequest, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: 'Validation failed', details: errors.array() });
    return;
  }

  try {
    const firm = await firmsService.createFirm(req.body as CreateFirmDto);
    res.status(201).json({ data: firm });
  } catch (err) {
    logger.error('[firms.controller] createFirm error:', err);
    const status = (err as { statusCode?: number }).statusCode ?? 500;
    const message = status === 409 ? (err as Error).message : 'Internal server error';
    res.status(status).json({ error: message });
  }
}

// ─── GET /api/firms/:id ───────────────────────────────────────────────────────

export async function getFirm(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (!UUID_RE.test(id)) {
    res.status(404).json({ error: 'Firm not found' });
    return;
  }

  try {
    const firm = await firmsService.findFirmById(id);

    if (!firm) {
      res.status(404).json({ error: 'Firm not found' });
      return;
    }

    res.json({ data: firm });
  } catch (err) {
    logger.error('[firms.controller] getFirm error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── PATCH /api/firms/:id ─────────────────────────────────────────────────────

export async function updateFirm(req: AuthenticatedRequest, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: 'Validation failed', details: errors.array() });
    return;
  }

  const { id } = req.params;
  const allowed = [
    'name',
    'location',
    'website',
    'logo_url',
    'description',
    'contact_name',
    'contact_email',
    'contact_role',
    'contact_phone',
    'account_manager_id',
    'default_prompt_id',
  ] as const;
  const updates: Partial<UpdateFirmDto> = {};

  for (const key of allowed) {
    if (key in req.body) {
      (updates as Record<string, unknown>)[key] = (req.body as Record<string, unknown>)[key];
    }
  }

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: 'No updatable fields provided' });
    return;
  }

  try {
    const firm = await firmsService.updateFirm(id, updates);

    if (!firm) {
      res.status(404).json({ error: 'Firm not found' });
      return;
    }

    res.json({ data: firm });
  } catch (err) {
    logger.error('[firms.controller] updateFirm error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── POST /api/firms/:id/logo ─────────────────────────────────────────────────

export async function uploadFirmLogo(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const { image } = req.body as { image?: string };

  if (!image) {
    res.status(400).json({ error: 'image is required' });
    return;
  }

  if (!UUID_RE.test(id)) {
    res.status(404).json({ error: 'Firm not found' });
    return;
  }

  try {
    const firm = await firmsService.findFirmById(id);
    if (!firm) {
      res.status(404).json({ error: 'Firm not found' });
      return;
    }

    const mimeMatch = image.match(/^data:(image\/\w+);base64,/);
    const mimeType  = mimeMatch?.[1] ?? 'image/jpeg';
    const ext       = mimeType.split('/')[1];
    const key       = `firms/${id}/logo.${ext}`;

    const logoUrl = await uploadBase64Image(key, image);

    await firmsService.updateFirm(id, { logo_url: logoUrl });

    res.json({ data: { logo_url: logoUrl } });
  } catch (err) {
    logger.error('[firms.controller] uploadFirmLogo error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── DELETE /api/firms/:id ────────────────────────────────────────────────────

export async function deleteFirm(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;

  if (!UUID_RE.test(id)) {
    res.status(400).json({ error: 'Invalid firm ID' });
    return;
  }

  try {
    const deleted = await firmsService.deleteFirm(id);

    if (!deleted) {
      res.status(404).json({ error: 'Firm not found' });
      return;
    }

    res.json({ message: 'Firm deleted successfully' });
  } catch (err) {
    logger.error('[firms.controller] deleteFirm error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
