import { Request, Response } from 'express';
import logger from '../../config/logger';
import { uploadBase64Image } from '../../config/storage';
import * as orgSettingsService from './org-settings.service';

// ─── GET /api/org-settings ────────────────────────────────────────────────────

export async function getOrgSettings(_req: Request, res: Response): Promise<void> {
  try {
    const settings = await orgSettingsService.getOrgSettings();

    // Return an empty-logo object when the table row doesn't exist yet
    if (!settings) {
      res.json({ data: { id: null, logo_url: null, updated_at: null } });
      return;
    }

    res.json({ data: settings });
  } catch (err) {
    logger.error('[org-settings.controller] getOrgSettings error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── POST /api/org-settings/logo ─────────────────────────────────────────────

export async function uploadOrgLogo(req: Request, res: Response): Promise<void> {
  const { image } = req.body as { image?: string };

  if (!image) {
    res.status(400).json({ error: 'image is required' });
    return;
  }

  try {
    const mimeMatch = image.match(/^data:(image\/\w+);base64,/);
    const mimeType  = mimeMatch?.[1] ?? 'image/jpeg';
    const ext       = mimeType.split('/')[1];
    const key       = `org/logo.${ext}`; // canonical single path — S3 upsert replaces in-place

    const logoUrl = await uploadBase64Image(key, image);

    await orgSettingsService.updateOrgSettings({ logo_url: logoUrl });

    res.json({ data: { logo_url: logoUrl } });
  } catch (err) {
    logger.error('[org-settings.controller] uploadOrgLogo error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
