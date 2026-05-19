import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireAdmin, requireMember } from '../../middleware/rbac';
import {
  createTaskValidation,
  updateTaskValidation,
  assignApproveValidation,
  regenerateValidation,
  resolveValidation,
  deleteTaskValidation,
  archiveTaskValidation,
  transitionTaskValidation,
} from './tasks.validation';
import * as tasksController from './tasks.controller';
import * as attachmentsController from './attachments.controller';
import { getRunningTimer } from '../time-entries/time-entries.controller';
import timeEntriesRouter from '../time-entries/time-entries.routes';

const router = Router({ mergeParams: true });

// All task routes require authentication
router.use(authenticate);

// ─── Running-timer shortcut — must be before /:id param routes ───────────────

// GET /api/tasks/me/running-timer — returns the currently-running timer for the caller
router.get('/me/running-timer', requireMember, getRunningTimer);

// POST /api/tasks — admin only: create a manual task
router.post('/', requireAdmin, createTaskValidation, tasksController.createTask);

// GET  /api/tasks — admin: all with filters; member: own only
router.get('/', requireMember, tasksController.listTasks);

// GET  /api/tasks/:id
router.get('/:id', requireMember, tasksController.getTask);

// GET  /api/tasks/:id/subtasks — list direct sub-tasks for a parent task
router.get('/:id/subtasks', requireMember, tasksController.listSubTasks);

// PATCH /api/tasks/:id — admin: full edit; member: estimated_hours only
router.patch('/:id', requireMember, updateTaskValidation, tasksController.updateTask);

// PATCH /api/tasks/:id/assign-approve — admin only
router.patch('/:id/assign-approve', requireAdmin, assignApproveValidation, tasksController.assignAndApprove);

// PATCH /api/tasks/:id/discard — admin only, draft tasks only
router.patch('/:id/discard', requireAdmin, tasksController.discardTask);

// POST  /api/tasks/:id/regenerate — admin only
router.post('/:id/regenerate', requireAdmin, regenerateValidation, tasksController.regenerateTaskContent);

// PATCH /api/tasks/:id/resolve — member (assignee) only
router.patch('/:id/resolve', requireMember, resolveValidation, tasksController.resolveTask);

// DELETE /api/tasks/:id — admin only, discarded tasks only
router.delete('/:id', requireAdmin, deleteTaskValidation, tasksController.deleteTask);

// PATCH /api/tasks/:id/archive — admin only
router.patch('/:id/archive', requireAdmin, archiveTaskValidation, tasksController.archiveTask);

// PATCH /api/tasks/:id/transition — admin only
router.patch('/:id/transition', requireAdmin, transitionTaskValidation, tasksController.transitionTask);

// ─── Attachment sub-resource ──────────────────────────────────────────────────

// GET    /api/tasks/:id/attachments — list attachments for a task
router.get('/:id/attachments', requireMember, attachmentsController.listAttachments);

// POST   /api/tasks/:id/attachments — upload an attachment
router.post('/:id/attachments', requireMember, attachmentsController.uploadAttachment);

// DELETE /api/tasks/:id/attachments/:attId — delete an attachment
router.delete('/:id/attachments/:attId', requireMember, attachmentsController.deleteAttachment);

// ─── Time-entries sub-resource ────────────────────────────────────────────────

// Mount all /api/tasks/:id/time-entries/* routes via the dedicated router.
// mergeParams on both routers ensures :id is visible inside the time-entries router.
router.use('/:id/time-entries', timeEntriesRouter);

export default router;
