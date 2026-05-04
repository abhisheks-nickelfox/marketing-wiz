import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireAdmin } from '../../middleware/rbac';
import { createSkillValidation, updateSkillValidation } from './skills.validation';
import * as skillsController from './skills.controller';

const router = Router();

// GET  /api/skills       — public (needed for onboarding before user has a JWT)
router.get('/', skillsController.listSkills);

// POST /api/skills       — admin only: create a new skill
router.post('/', authenticate, requireAdmin, createSkillValidation, skillsController.createSkill);

// PATCH  /api/skills/:id — admin only: update name, category, description, color
router.patch('/:id', authenticate, requireAdmin, updateSkillValidation, skillsController.updateSkill);

// PUT    /api/skills/:id/members — admin only: replace the member list for a skill
router.put('/:id/members', authenticate, requireAdmin, skillsController.setSkillMembers);

// DELETE /api/skills/:id — admin only: remove a skill (cascades user_skills)
router.delete('/:id', authenticate, requireAdmin, skillsController.deleteSkill);

export default router;
