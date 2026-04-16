import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireAdmin, requireSuperAdmin } from '../../middleware/rbac';
import {
  listTeamValidation,
  createTeamMemberValidation,
  updateTeamMemberValidation,
} from './team.validation';
import * as teamController from './team.controller';

const router = Router();

// All team routes require authentication + admin role
router.use(authenticate, requireAdmin);

// GET  /api/team
router.get('/', listTeamValidation, teamController.listTeam);

// POST /api/team — create a new member (Supabase Auth + profile row)
router.post('/', createTeamMemberValidation, teamController.createTeamMember);

// GET  /api/team/:id
router.get('/:id', teamController.getTeamMember);

// PATCH /api/team/:id
router.patch('/:id', updateTeamMemberValidation, teamController.updateTeamMember);

// DELETE /api/team/:id — super_admin only; hard-deletes auth user + profile
router.delete('/:id', requireSuperAdmin, teamController.deleteTeamMember);

export default router;
