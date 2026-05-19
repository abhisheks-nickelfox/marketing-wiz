import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireMember } from '../../middleware/rbac';
import * as ctrl from './time-entries.controller';
import { createTimeEntryValidation, updateTimeEntryValidation } from './time-entries.validation';

// mergeParams: true is required so req.params.id (the task ID from the parent
// tasks router) is accessible inside this router's handlers.
const router = Router({ mergeParams: true });

// ─── Per-task time-entry sub-resource (/api/tasks/:id/time-entries) ───────────

// GET  /api/tasks/:id/time-entries
router.get('/', authenticate, requireMember, ctrl.listEntries);

// POST /api/tasks/:id/time-entries
router.post('/', authenticate, requireMember, createTimeEntryValidation, ctrl.createEntry);

// POST /api/tasks/:id/time-entries/start  — starts a live timer
router.post('/start', authenticate, requireMember, ctrl.startTimer);

// PATCH /api/tasks/:id/time-entries/:entryId/stop  — stops a running timer
router.patch('/:entryId/stop', authenticate, requireMember, ctrl.stopTimer);

// PATCH /api/tasks/:id/time-entries/:entryId
router.patch('/:entryId', authenticate, requireMember, updateTimeEntryValidation, ctrl.updateEntry);

// DELETE /api/tasks/:id/time-entries/:entryId
router.delete('/:entryId', authenticate, requireMember, ctrl.deleteEntry);

export default router;
