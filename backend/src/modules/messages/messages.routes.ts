import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireMember } from '../../middleware/rbac';
import {
  getMessagesValidation,
  createMessageValidation,
  addReactionValidation,
  removeReactionValidation,
} from './messages.validation';
import * as messagesController from './messages.controller';

const router = Router();

// GET /api/messages/stream — SSE endpoint; auth via ?token= query param
// Must be registered BEFORE router.use(authenticate) because EventSource
// cannot send the Authorization header, so this route handles auth itself.
router.get('/stream', messagesController.streamMessages);

// All other message routes require a valid JWT and at least member-level access.
router.use(authenticate);

// GET  /api/messages?scope=X&scope_id=Y — list non-deleted messages for a scope
router.get('/', requireMember, getMessagesValidation, messagesController.listMessages);

// POST /api/messages — create a new message
router.post('/', requireMember, createMessageValidation, messagesController.createMessage);

// POST /api/messages/read — mark all messages in a scope as read
router.post('/read', requireMember, messagesController.markRead);

// POST /api/messages/typing — broadcast typing indicator (no DB write)
router.post('/typing', requireMember, messagesController.sendTyping);

// POST /api/messages/:id/reactions — add (or no-op if duplicate) a reaction
router.post('/:id/reactions', requireMember, addReactionValidation, messagesController.addReaction);

// DELETE /api/messages/:id/reactions — remove the caller's reaction
router.delete('/:id/reactions', requireMember, removeReactionValidation, messagesController.removeReaction);

// DELETE /api/messages/:id — soft-delete (author or admin only, enforced in service)
router.delete('/:id', requireMember, messagesController.deleteMessage);

export default router;
