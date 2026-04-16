import { body, param } from 'express-validator';

// All statuses an admin may set via the transition endpoint
const ADMIN_TRANSITION_TARGETS = [
  'draft', 'in_progress', 'resolved', 'internal_review', 'client_review',
  'compliance_review', 'approved', 'closed', 'revisions',
];

export const createTaskValidation = [
  body('firm_id')
    .customSanitizer((v) => (v && typeof v === 'string' && v.trim() ? v.trim() : undefined))
    .notEmpty().withMessage('firm_id is required')
    .custom((v) => !v || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v))
    .withMessage('firm_id must be a valid UUID'),
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('type')
    .isIn(['task', 'design', 'development', 'account_management'])
    .withMessage('type must be one of: task, design, development, account_management'),
  body('priority')
    .optional()
    .isIn(['low', 'normal', 'high', 'urgent'])
    .withMessage('priority must be one of: low, normal, high, urgent'),
  body('description').optional().isString(),
];

export const updateTaskValidation = [
  param('id').isUUID('loose').withMessage('Invalid task ID'),
  body('title').optional().notEmpty().withMessage('Title cannot be blank'),
  body('description').optional().isString(),
  body('type')
    .optional()
    .isIn(['task', 'design', 'development', 'account_management'])
    .withMessage('Invalid type'),
  body('priority')
    .optional()
    .isIn(['low', 'normal', 'high', 'urgent'])
    .withMessage('Invalid priority'),
  body('change_note').optional().isString(),
  body('estimated_hours').optional().isFloat({ min: 0, max: 999.99 }).withMessage('Hours must be >= 0'),
];

export const assignApproveValidation = [
  param('id').isUUID('loose').withMessage('Invalid task ID'),
  body('assignee_id').isUUID('loose').withMessage('assignee_id must be a valid UUID'),
  body('priority')
    .optional()
    .isIn(['low', 'normal', 'high', 'urgent'])
    .withMessage('Invalid priority'),
  body('deadline')
    .optional({ nullable: true })
    .isISO8601()
    .withMessage('deadline must be a valid ISO 8601 date'),
  body('project_id')
    .optional({ nullable: true })
    .isUUID('loose')
    .withMessage('project_id must be a valid UUID'),
];

export const regenerateValidation = [
  param('id').isUUID('loose').withMessage('Invalid task ID'),
  body('additional_instruction').optional().isString(),
];

export const resolveValidation = [
  param('id').isUUID('loose').withMessage('Invalid task ID'),
  body('final_comment').optional().isString(),
  body('estimated_hours').optional().isFloat({ min: 0, max: 999.99 }).withMessage('Hours must be >= 0'),
];

export const deleteTaskValidation = [
  param('id')
    .custom((v) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v))
    .withMessage('Invalid task ID'),
];

export const archiveTaskValidation = [
  param('id').isUUID('loose').withMessage('Invalid task ID'),
  body('archived').isBoolean().withMessage('archived must be a boolean'),
];

export const transitionTaskValidation = [
  param('id').isUUID('loose').withMessage('Invalid task ID'),
  body('status')
    .isIn(ADMIN_TRANSITION_TARGETS)
    .withMessage('Invalid target status'),
  body('change_note').optional().isString(),
];
