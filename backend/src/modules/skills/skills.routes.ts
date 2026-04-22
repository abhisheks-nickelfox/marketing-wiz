import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireAdmin } from '../../middleware/rbac';
import { createSkillValidation } from './skills.validation';
import * as skillsController from './skills.controller';

const router = Router();

// GET  /api/skills       — public (needed for onboarding before user has a JWT)
router.get('/', skillsController.listSkills);

// POST /api/skills       — admin only: create a new skill
router.post('/', authenticate, requireAdmin, createSkillValidation, skillsController.createSkill);

// DELETE /api/skills/:id — admin only: remove a skill (cascades user_skills)
router.delete('/:id', authenticate, requireAdmin, skillsController.deleteSkill);

export default router;
