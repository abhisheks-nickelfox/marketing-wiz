import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireAdmin, requireMember } from '../middleware/rbac';
import {
  listTasks,
  getTask,
  updateTask,
  assignAndApprove,
  discardTask,
  regenerateTaskContent,
  resolveTask,
  deleteTask,
  archiveTask,
  transitionTask,
  updateTaskValidation,
  assignApproveValidation,
  regenerateValidation,
  resolveValidation,
  deleteTaskValidation,
  archiveTaskValidation,
  transitionTaskValidation,
  createTask,
  createTaskValidation,
} from '../controllers/tasks.controller';
import { listTimeLogs, createTimeLog, createTimeLogValidation, updateTimeLog, updateTimeLogValidation, deleteTimeLog, deleteTimeLogValidation } from '../controllers/timeLogs.controller';

const router = Router();

// All task routes require authentication
router.use(authenticate);

// POST /api/tasks           — admin only: create a manual task
router.post('/', requireAdmin, createTaskValidation, createTask);

// GET  /api/tasks           — admin: all with filters; member: own only
router.get('/', requireMember, listTasks);

// GET  /api/tasks/:id
router.get('/:id', requireMember, getTask);

// PATCH /api/tasks/:id      — admin: full edit; member: estimated_hours only
router.patch('/:id', requireMember, updateTaskValidation, updateTask);

// PATCH /api/tasks/:id/assign-approve  — admin only
router.patch('/:id/assign-approve', requireAdmin, assignApproveValidation, assignAndApprove);

// PATCH /api/tasks/:id/discard         — admin only, draft tasks only
router.patch('/:id/discard', requireAdmin, discardTask);

// POST  /api/tasks/:id/regenerate      — admin only
router.post('/:id/regenerate', requireAdmin, regenerateValidation, regenerateTaskContent);

// PATCH /api/tasks/:id/resolve         — member (assignee) only
router.patch('/:id/resolve', requireMember, resolveValidation, resolveTask);

// DELETE /api/tasks/:id                — admin only, discarded tasks only
router.delete('/:id', requireAdmin, deleteTaskValidation, deleteTask);

// PATCH /api/tasks/:id/archive         — admin only
router.patch('/:id/archive', requireAdmin, archiveTaskValidation, archiveTask);

// PATCH /api/tasks/:id/transition      — admin only
router.patch('/:id/transition', requireAdmin, transitionTaskValidation, transitionTask);

// ─── Time-log sub-resource ────────────────────────────────────────────────────

// GET  /api/tasks/:id/time-logs
router.get('/:id/time-logs', requireMember, listTimeLogs);

// POST /api/tasks/:id/time-logs
router.post('/:id/time-logs', requireMember, createTimeLogValidation, createTimeLog);

// PATCH /api/tasks/:id/time-logs/:logId
router.patch('/:id/time-logs/:logId', requireMember, updateTimeLogValidation, updateTimeLog);

// DELETE /api/tasks/:id/time-logs/:logId
router.delete('/:id/time-logs/:logId', requireMember, deleteTimeLogValidation, deleteTimeLog);

export default router;
