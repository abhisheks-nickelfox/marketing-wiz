import { body, param, query } from 'express-validator';

const WORKFLOW_STATUSES = ['todo', 'in_progress', 'in_review', 'approved', 'completed'];
const PRIORITIES = ['high', 'medium', 'low'];

export const listProjectsValidation = [
  query('firm_id').optional().isUUID('loose').withMessage('firm_id must be a valid UUID'),
];

export const createProjectValidation = [
  body('firm_id')
    .notEmpty().withMessage('firm_id is required')
    .isUUID('loose').withMessage('firm_id must be a valid UUID'),
  body('name').trim().notEmpty().matches(/[a-zA-Z]/).withMessage('Project name must contain at least one letter'),
  body('description').optional().isString(),
  body('workflow_status')
    .optional()
    .isIn(WORKFLOW_STATUSES)
    .withMessage(`workflow_status must be one of: ${WORKFLOW_STATUSES.join(', ')}`),
  body('member_ids')
    .optional()
    .isArray().withMessage('member_ids must be an array'),
  body('member_ids.*')
    .optional()
    .isUUID('loose').withMessage('Each member_id must be a valid UUID'),
  body('start_date').optional({ nullable: true }).isISO8601().withMessage('start_date must be a valid date (YYYY-MM-DD)'),
  body('end_date').optional({ nullable: true }).isISO8601().withMessage('end_date must be a valid date (YYYY-MM-DD)'),
  body('priority').optional().isIn(PRIORITIES).withMessage(`priority must be one of: ${PRIORITIES.join(', ')}`),
];

export const updateProjectValidation = [
  param('id').isUUID('loose').withMessage('Invalid project ID'),
  body('name').optional().trim().notEmpty().matches(/[a-zA-Z]/).withMessage('Project name must contain at least one letter'),
  body('description').optional().isString(),
  body('status')
    .optional()
    .isIn(['active', 'archived'])
    .withMessage('status must be active or archived'),
  body('workflow_status')
    .optional()
    .isIn(WORKFLOW_STATUSES)
    .withMessage(`workflow_status must be one of: ${WORKFLOW_STATUSES.join(', ')}`),
  body('member_ids')
    .optional()
    .isArray().withMessage('member_ids must be an array'),
  body('member_ids.*')
    .optional()
    .isUUID('loose').withMessage('Each member_id must be a valid UUID'),
  body('start_date').optional({ nullable: true }).isISO8601().withMessage('start_date must be a valid date (YYYY-MM-DD)'),
  body('end_date').optional({ nullable: true }).isISO8601().withMessage('end_date must be a valid date (YYYY-MM-DD)'),
  body('priority').optional().isIn(PRIORITIES).withMessage(`priority must be one of: ${PRIORITIES.join(', ')}`),
];
