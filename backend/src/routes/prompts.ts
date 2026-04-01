import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireAdmin, requirePermission } from '../middleware/rbac';
import {
  listPrompts,
  createPrompt,
  updatePrompt,
  createPromptValidation,
  updatePromptValidation,
} from '../controllers/prompts.controller';

const router = Router();

router.use(authenticate);

// GET  /api/prompts — admin or member with manage_prompts
router.get('/', requirePermission('manage_prompts'), listPrompts);

// POST /api/prompts — admin or member with manage_prompts
router.post('/', requirePermission('manage_prompts'), createPromptValidation, createPrompt);

// PATCH /api/prompts/:id — admin or member with manage_prompts
router.patch('/:id', requirePermission('manage_prompts'), updatePromptValidation, updatePrompt);

export default router;
