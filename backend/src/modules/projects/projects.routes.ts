import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireAdmin, requireMember } from '../../middleware/rbac';
import {
  listProjectDirectEntries,
  startProjectTimer,
  stopProjectTimer,
  createProjectEntry,
  updateProjectEntry,
  deleteProjectEntry,
} from '../time-entries/time-entries.controller';
import { createTimeEntryValidation, updateTimeEntryValidation } from '../time-entries/time-entries.validation';
import {
  listProjectsValidation,
  createProjectValidation,
  updateProjectValidation,
} from './projects.validation';
import * as ctrl from './projects.controller';
import * as attachCtrl from './project-attachments.controller';
import {
  listAttachmentsValidation,
  uploadAttachmentValidation,
  deleteAttachmentValidation,
} from './project-attachments.validation';

const router = Router();

// ── Project CRUD ──────────────────────────────────────────────────────────────

// GET /api/projects?firm_id=X  — all authenticated users can list projects
router.get('/',     authenticate, requireMember, listProjectsValidation, ctrl.listProjects);

// GET /api/projects/shared/:token — public, no auth (must be before /:id)
router.get('/shared/:token', ctrl.getSharedProject);

// POST /api/projects/:id/share — generate / get share token (admin)
router.post('/:id/share', authenticate, requireAdmin, ctrl.generateShareLink);

// GET /api/projects/:id        — project detail with members + task count
router.get('/:id',  authenticate, requireMember, ctrl.getProject);

// GET /api/projects/:id/overview  — full overview: tasks grouped by status + members
router.get('/:id/overview', authenticate, requireMember, ctrl.getProjectOverview);

// ── Project-level time entries ────────────────────────────────────────────────

// GET    /api/projects/:id/time-entries              — direct project entries + per-task rollup
router.get('/:id/time-entries',                      authenticate, requireMember, listProjectDirectEntries);

// POST   /api/projects/:id/time-entries/start        — start a project-level timer (must be before /:id/time-entries/:entryId/stop)
router.post('/:id/time-entries/start',               authenticate, requireMember, startProjectTimer);

// PATCH  /api/projects/:id/time-entries/:entryId/stop — stop a running project-level timer
router.patch('/:id/time-entries/:entryId/stop',      authenticate, requireMember, stopProjectTimer);

// POST   /api/projects/:id/time-entries              — create a manual project-level entry
router.post('/:id/time-entries',                     authenticate, requireMember, createTimeEntryValidation, createProjectEntry);

// PATCH  /api/projects/:id/time-entries/:entryId     — update a project-level entry
router.patch('/:id/time-entries/:entryId',           authenticate, requireMember, updateTimeEntryValidation, updateProjectEntry);

// DELETE /api/projects/:id/time-entries/:entryId     — delete a project-level entry
router.delete('/:id/time-entries/:entryId',          authenticate, requireMember, deleteProjectEntry);

// GET /api/projects/:id/tasks     — flat task list for this project (used by delete modal)
router.get('/:id/tasks', authenticate, requireAdmin, ctrl.getProjectTasks);

// POST /api/projects            — admin creates project (optional members + workflow_status)
router.post('/',    authenticate, requireAdmin, createProjectValidation, ctrl.createProject);

// PATCH /api/projects/:id       — admin updates name/description/workflow_status/member_ids
router.patch('/:id', authenticate, requireAdmin, updateProjectValidation, ctrl.updateProject);

// PATCH /api/projects/:id/archive — toggle active/archived
router.patch('/:id/archive', authenticate, requireAdmin, ctrl.archiveProject);

// DELETE /api/projects/:id      — admin only, blocked if tasks exist
router.delete('/:id', authenticate, requireAdmin, ctrl.deleteProject);

// ── Member management ─────────────────────────────────────────────────────────

// GET    /api/projects/:id/members           — list members
router.get('/:id/members',           authenticate, requireMember, ctrl.listMembers);

// POST   /api/projects/:id/members           — add a member { user_id }
router.post('/:id/members',          authenticate, requireAdmin,  ctrl.addMember);

// DELETE /api/projects/:id/members/:userId   — remove a member
router.delete('/:id/members/:userId', authenticate, requireAdmin, ctrl.removeMember);

// ── Project Attachments ───────────────────────────────────────────────────────

// GET    /api/projects/:id/attachments          — list all attachments for the project
router.get('/:id/attachments',           authenticate, requireMember, listAttachmentsValidation,  attachCtrl.listProjectAttachments);

// POST   /api/projects/:id/attachments          — upload an attachment
router.post('/:id/attachments',          authenticate, requireMember, uploadAttachmentValidation, attachCtrl.uploadProjectAttachment);

// DELETE /api/projects/:id/attachments/:attId   — delete an attachment
router.delete('/:id/attachments/:attId', authenticate, requireMember, deleteAttachmentValidation, attachCtrl.deleteProjectAttachment);

export default router;
