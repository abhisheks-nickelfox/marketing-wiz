import { Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import supabase from '../config/supabase';
import { AuthenticatedRequest } from '../types';

// ─── Validation ───────────────────────────────────────────────────────────────

export const createPromptValidation = [
  body('name').notEmpty().withMessage('Prompt name is required'),
  body('type')
    .isIn(['pm', 'campaigns', 'content'])
    .withMessage('type must be pm | campaigns | content'),
  body('system_prompt').notEmpty().withMessage('system_prompt is required'),
  body('firm_id').optional().isUUID('loose').withMessage('firm_id must be a valid UUID'),
  body('is_active').optional().isBoolean(),
];

export const updatePromptValidation = [
  param('id').isUUID('loose').withMessage('Invalid prompt ID'),
  body('name').optional().notEmpty().withMessage('Name cannot be blank'),
  body('type')
    .optional()
    .isIn(['pm', 'campaigns', 'content'])
    .withMessage('type must be pm | campaigns | content'),
  body('system_prompt').optional().notEmpty().withMessage('system_prompt cannot be blank'),
  body('firm_id').optional().isUUID('loose').withMessage('firm_id must be a valid UUID'),
  body('is_active').optional().isBoolean(),
];

// ─── GET /api/prompts ─────────────────────────────────────────────────────────

export async function listPrompts(_req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('prompts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.json({ data });
  } catch (err) {
    console.error('[prompts.controller] listPrompts error:', err);
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

  const {
    name,
    type,
    system_prompt,
    firm_id = null,
    is_active = true,
  } = req.body as {
    name: string;
    type: string;
    system_prompt: string;
    firm_id?: string | null;
    is_active?: boolean;
  };

  try {
    const { data, error } = await supabase
      .from('prompts')
      .insert({ name, type, system_prompt, firm_id, is_active })
      .select()
      .single();

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.status(201).json({ data });
  } catch (err) {
    console.error('[prompts.controller] createPrompt error:', err);
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
  const allowed = ['name', 'type', 'system_prompt', 'firm_id', 'is_active'];
  const updates: Record<string, unknown> = {};

  for (const key of allowed) {
    if (key in req.body) {
      updates[key] = (req.body as Record<string, unknown>)[key];
    }
  }

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: 'No updatable fields provided' });
    return;
  }

  try {
    const { data, error } = await supabase
      .from('prompts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    if (!data) {
      res.status(404).json({ error: 'Prompt not found' });
      return;
    }

    res.json({ data });
  } catch (err) {
    console.error('[prompts.controller] updatePrompt error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
