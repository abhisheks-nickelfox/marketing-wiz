import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireAdmin, requireSuperAdmin } from '../middleware/rbac';
import {
  listTeam,
  getTeamMember,
  createTeamMember,
  createTeamMemberValidation,
  updateTeamMember,
  updateTeamMemberValidation,
  deleteTeamMember,
} from '../controllers/team.controller';

const router = Router();

// All team routes are admin-only (super_admin passes requireAdmin after the role check update)
router.use(authenticate, requireAdmin);

// GET  /api/team
router.get('/', listTeam);

// POST /api/team   — create a new member (Supabase Auth + profile row)
router.post('/', createTeamMemberValidation, createTeamMember);

// GET  /api/team/:id
router.get('/:id', getTeamMember);

// PATCH /api/team/:id
router.patch('/:id', updateTeamMemberValidation, updateTeamMember);

// DELETE /api/team/:id — super_admin only; hard-deletes auth user + profile
router.delete('/:id', requireSuperAdmin, deleteTeamMember);

export default router;
