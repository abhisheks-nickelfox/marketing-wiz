import { body, param, query } from 'express-validator';

const WORKFLOW_STATUSES = ['todo', 'in_progress', 'in_review', 'approved', 'completed'];

export const listProjectsValidation = [
  query('firm_id').optional().isUUID('loose').withMessage('firm_id must be a valid UUID'),
];

export const createProjectValidation = [
  body('firm_id')
    .notEmpty().withMessage('firm_id is required')
    .isUUID('loose').withMessage('firm_id must be a valid UUID'),
  body('name').trim().notEmpty().withMessage('name is required'),
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
];

export const updateProjectValidation = [
  param('id').isUUID('loose').withMessage('Invalid project ID'),
  body('name').optional().trim().notEmpty().withMessage('name cannot be blank'),
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
];
