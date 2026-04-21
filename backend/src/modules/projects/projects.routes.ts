import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireAdmin, requireMember, requireSuperAdmin } from '../../middleware/rbac';
import {
  listProjectsValidation,
  createProjectValidation,
  updateProjectValidation,
} from './projects.validation';
import * as ctrl from './projects.controller';

const router = Router();

// ── Project CRUD ──────────────────────────────────────────────────────────────

// GET /api/projects?firm_id=X  — all authenticated users can list projects
router.get('/',     authenticate, requireMember, listProjectsValidation, ctrl.listProjects);

// GET /api/projects/:id        — project detail with members + ticket count
router.get('/:id',  authenticate, requireMember, ctrl.getProject);

// GET /api/projects/:id/overview  — full overview: tasks grouped by status + members
router.get('/:id/overview', authenticate, requireMember, ctrl.getProjectOverview);

// POST /api/projects            — admin creates project (optional members + workflow_status)
router.post('/',    authenticate, requireAdmin, createProjectValidation, ctrl.createProject);

// PATCH /api/projects/:id       — admin updates name/description/workflow_status/member_ids
router.patch('/:id', authenticate, requireAdmin, updateProjectValidation, ctrl.updateProject);

// PATCH /api/projects/:id/archive — toggle active/archived
router.patch('/:id/archive', authenticate, requireAdmin, ctrl.archiveProject);

// DELETE /api/projects/:id      — super_admin only, blocked if tickets exist
router.delete('/:id', authenticate, requireSuperAdmin, ctrl.deleteProject);

// ── Member management ─────────────────────────────────────────────────────────

// GET    /api/projects/:id/members           — list members
router.get('/:id/members',           authenticate, requireMember, ctrl.listMembers);

// POST   /api/projects/:id/members           — add a member { user_id }
router.post('/:id/members',          authenticate, requireAdmin,  ctrl.addMember);

// DELETE /api/projects/:id/members/:userId   — remove a member
router.delete('/:id/members/:userId', authenticate, requireAdmin, ctrl.removeMember);

export default router;
