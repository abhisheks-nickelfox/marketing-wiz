import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireAdmin, requireMember } from '../middleware/rbac';
import {
  listTickets,
  getTicket,
  updateTicket,
  assignAndApprove,
  discardTicket,
  regenerateTicketHandler,
  resolveTicket,
  deleteTicket,
  archiveTicket,
  transitionTicket,
  updateTicketValidation,
  assignApproveValidation,
  regenerateValidation,
  resolveValidation,
  deleteTicketValidation,
  archiveTicketValidation,
  transitionTicketValidation,
  createTicket,
  createTicketValidation,
} from '../controllers/tickets.controller';
import { listTimeLogs, createTimeLog, createTimeLogValidation, updateTimeLog, updateTimeLogValidation, deleteTimeLog, deleteTimeLogValidation } from '../controllers/timeLogs.controller';

const router = Router();

// All ticket routes require authentication
router.use(authenticate);

// POST /api/tickets           — admin only: create a manual ticket
router.post('/', requireAdmin, createTicketValidation, createTicket);

// GET  /api/tickets           — admin: all with filters; member: own only
router.get('/', requireMember, listTickets);

// GET  /api/tickets/:id
router.get('/:id', requireMember, getTicket);

// PATCH /api/tickets/:id      — admin: full edit; member: estimated_hours only
router.patch('/:id', requireMember, updateTicketValidation, updateTicket);

// PATCH /api/tickets/:id/assign-approve  — admin only
router.patch('/:id/assign-approve', requireAdmin, assignApproveValidation, assignAndApprove);

// PATCH /api/tickets/:id/discard         — admin only, draft tickets only
router.patch('/:id/discard', requireAdmin, discardTicket);

// POST  /api/tickets/:id/regenerate      — admin only
router.post('/:id/regenerate', requireAdmin, regenerateValidation, regenerateTicketHandler);

// PATCH /api/tickets/:id/resolve         — member (assignee) only
router.patch('/:id/resolve', requireMember, resolveValidation, resolveTicket);

// DELETE /api/tickets/:id                — admin only, discarded tickets only
router.delete('/:id', requireAdmin, deleteTicketValidation, deleteTicket);

// PATCH /api/tickets/:id/archive         — admin only
router.patch('/:id/archive', requireAdmin, archiveTicketValidation, archiveTicket);

// PATCH /api/tickets/:id/transition      — admin only
router.patch('/:id/transition', requireAdmin, transitionTicketValidation, transitionTicket);

// ─── Time-log sub-resource ────────────────────────────────────────────────────

// GET  /api/tickets/:id/time-logs
router.get('/:id/time-logs', requireMember, listTimeLogs);

// POST /api/tickets/:id/time-logs
router.post('/:id/time-logs', requireMember, createTimeLogValidation, createTimeLog);

// PATCH /api/tickets/:id/time-logs/:logId
router.patch('/:id/time-logs/:logId', requireMember, updateTimeLogValidation, updateTimeLog);

// DELETE /api/tickets/:id/time-logs/:logId
router.delete('/:id/time-logs/:logId', requireMember, deleteTimeLogValidation, deleteTimeLog);

export default router;
