import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requirePermission } from '../../middleware/rbac';
import { createPromptValidation, updatePromptValidation } from './prompts.validation';
import * as promptsController from './prompts.controller';

const router = Router();

// All prompt routes require authentication
router.use(authenticate);

// GET  /api/prompts — requires manage_prompts permission
router.get('/', requirePermission('manage_prompts'), promptsController.listPrompts);

// POST /api/prompts — requires manage_prompts permission
router.post('/', requirePermission('manage_prompts'), createPromptValidation, promptsController.createPrompt);

// PATCH /api/prompts/:id — requires manage_prompts permission
router.patch('/:id', requirePermission('manage_prompts'), updatePromptValidation, promptsController.updatePrompt);

export default router;
