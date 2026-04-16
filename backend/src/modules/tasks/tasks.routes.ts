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
import {
  createTimeLogValidation,
  updateTimeLogValidation,
  deleteTimeLogValidation,
} from './time-logs.validation';
import * as tasksController from './tasks.controller';
import * as timeLogsController from './time-logs.controller';

const router = Router();

// All task routes require authentication
router.use(authenticate);

// POST /api/tasks — admin only: create a manual task
router.post('/', requireAdmin, createTaskValidation, tasksController.createTask);

// GET  /api/tasks — admin: all with filters; member: own only
router.get('/', requireMember, tasksController.listTasks);

// GET  /api/tasks/:id
router.get('/:id', requireMember, tasksController.getTask);

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

// ─── Time-log sub-resource ────────────────────────────────────────────────────

// GET  /api/tasks/:id/time-logs
router.get('/:id/time-logs', requireMember, timeLogsController.listTimeLogs);

// POST /api/tasks/:id/time-logs
router.post('/:id/time-logs', requireMember, createTimeLogValidation, timeLogsController.createTimeLog);

// PATCH /api/tasks/:id/time-logs/:logId
router.patch('/:id/time-logs/:logId', requireMember, updateTimeLogValidation, timeLogsController.updateTimeLog);

// DELETE /api/tasks/:id/time-logs/:logId
router.delete('/:id/time-logs/:logId', requireMember, deleteTimeLogValidation, timeLogsController.deleteTimeLog);

export default router;
