import { body, param } from 'express-validator';
import {
  VALID_STATUSES,
  VALID_TASK_TYPES,
  VALID_TASK_PRIORITIES,
  MAX_TIME_LOG_HOURS,
} from '../../config/constants';

export const createTaskValidation = [
  body('firm_id')
    .customSanitizer((v) => (v && typeof v === 'string' && v.trim() ? v.trim() : undefined))
    .notEmpty().withMessage('firm_id is required')
    .custom((v) => !v || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v))
    .withMessage('firm_id must be a valid UUID'),
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('type')
    .isIn(VALID_TASK_TYPES)
    .withMessage(`type must be one of: ${VALID_TASK_TYPES.join(', ')}`),
  body('priority')
    .optional()
    .isIn(VALID_TASK_PRIORITIES)
    .withMessage(`priority must be one of: ${VALID_TASK_PRIORITIES.join(', ')}`),
  body('description').optional().isString(),
];

export const updateTaskValidation = [
  param('id').isUUID('loose').withMessage('Invalid task ID'),
  body('title').optional().notEmpty().withMessage('Title cannot be blank'),
  body('description').optional().isString(),
  body('type')
    .optional()
    .isIn(VALID_TASK_TYPES)
    .withMessage(`type must be one of: ${VALID_TASK_TYPES.join(', ')}`),
  body('priority')
    .optional()
    .isIn(VALID_TASK_PRIORITIES)
    .withMessage(`priority must be one of: ${VALID_TASK_PRIORITIES.join(', ')}`),
  body('change_note').optional().isString(),
  body('estimated_hours')
    .optional()
    .isFloat({ min: 0, max: MAX_TIME_LOG_HOURS })
    .withMessage(`Hours must be between 0 and ${MAX_TIME_LOG_HOURS}`),
];

export const assignApproveValidation = [
  param('id').isUUID('loose').withMessage('Invalid task ID'),
  body('assignee_id').isUUID('loose').withMessage('assignee_id must be a valid UUID'),
  body('priority')
    .optional()
    .isIn(VALID_TASK_PRIORITIES)
    .withMessage(`priority must be one of: ${VALID_TASK_PRIORITIES.join(', ')}`),
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
  body('estimated_hours')
    .optional()
    .isFloat({ min: 0, max: MAX_TIME_LOG_HOURS })
    .withMessage(`Hours must be between 0 and ${MAX_TIME_LOG_HOURS}`),
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
    .isIn(VALID_STATUSES)
    .withMessage(`status must be one of: ${VALID_STATUSES.join(', ')}`),
  body('change_note').optional().isString(),
];
