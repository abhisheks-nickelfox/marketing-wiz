import logger from '../../config/logger';
import { Response } from 'express';
import { validationResult } from 'express-validator';
import { AuthenticatedRequest } from '../../types';
import * as promptsService from './prompts.service';
import type { CreatePromptDto, UpdatePromptDto } from './prompts.service';

// ─── GET /api/prompts ─────────────────────────────────────────────────────────

export async function listPrompts(_req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const prompts = await promptsService.findAllPrompts();
    res.json({ data: prompts });
  } catch (err) {
    logger.error('[prompts.controller] listPrompts error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── POST /api/prompts ────────────────────────────────────────────────────────

export async function createPrompt(req: AuthenticatedRequest, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: 'Validation failed', details: errors.array() });
    return;
  }

  try {
    const prompt = await promptsService.createPrompt(req.body as CreatePromptDto);
    res.status(201).json({ data: prompt });
  } catch (err) {
    logger.error('[prompts.controller] createPrompt error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── PATCH /api/prompts/:id ───────────────────────────────────────────────────

export async function updatePrompt(req: AuthenticatedRequest, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: 'Validation failed', details: errors.array() });
    return;
  }

  const { id } = req.params;
  const allowed = ['name', 'type', 'system_prompt', 'firm_id', 'is_active'] as const;
  const updates: Partial<UpdatePromptDto> = {};

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
    const prompt = await promptsService.updatePrompt(id, updates);

    if (!prompt) {
      res.status(404).json({ error: 'Prompt not found' });
      return;
    }

    res.json({ data: prompt });
  } catch (err) {
    logger.error('[prompts.controller] updatePrompt error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
