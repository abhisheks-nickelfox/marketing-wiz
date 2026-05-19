import { body, param, query } from 'express-validator';

const VALID_SCOPES = ['firm', 'project', 'task'] as const;

// ── GET /api/messages?scope=X&scope_id=Y ─────────────────────────────────────

export const getMessagesValidation = [
  query('scope')
    .isIn(VALID_SCOPES)
    .withMessage(`scope must be one of: ${VALID_SCOPES.join(', ')}`),
  query('scope_id')
    .isUUID('loose')
    .withMessage('scope_id must be a valid UUID'),
];

// ── POST /api/messages ────────────────────────────────────────────────────────

export const createMessageValidation = [
  body('scope')
    .isIn(VALID_SCOPES)
    .withMessage(`scope must be one of: ${VALID_SCOPES.join(', ')}`),
  body('scope_id')
    .isUUID('loose')
    .withMessage('scope_id must be a valid UUID'),
  body('body')
    .trim()
    .notEmpty()
    .withMessage('body is required')
    .isLength({ max: 10000 })
    .withMessage('body must not exceed 10000 characters'),
  body('parent_id')
    .optional({ nullable: true })
    .isUUID('loose')
    .withMessage('parent_id must be a valid UUID'),
  body('is_system')
    .optional({ nullable: true })
    .isBoolean()
    .withMessage('is_system must be a boolean'),
];

// ── POST /api/messages/:id/reactions ─────────────────────────────────────────

export const addReactionValidation = [
  param('id')
    .isUUID('loose')
    .withMessage('Invalid message ID'),
  body('emoji')
    .trim()
    .notEmpty()
    .withMessage('emoji is required')
    .isLength({ max: 8 })
    .withMessage('emoji must not exceed 8 characters'),
];

// ── DELETE /api/messages/:id/reactions ───────────────────────────────────────

export const removeReactionValidation = [
  param('id')
    .isUUID('loose')
    .withMessage('Invalid message ID'),
  body('emoji')
    .trim()
    .notEmpty()
    .withMessage('emoji is required')
    .isLength({ max: 8 })
    .withMessage('emoji must not exceed 8 characters'),
];
