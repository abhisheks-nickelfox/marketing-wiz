import { body, param, query } from 'express-validator';

export const listProjectsValidation = [
  query('firm_id')
    .optional()
    .isUUID('loose')
    .withMessage('firm_id must be a valid UUID'),
];

export const createProjectValidation = [
  body('firm_id')
    .notEmpty().withMessage('firm_id is required')
    .isUUID('loose').withMessage('firm_id must be a valid UUID'),
  body('name').trim().notEmpty().withMessage('name is required'),
  body('description').optional().isString(),
];

export const updateProjectValidation = [
  param('id').isUUID('loose').withMessage('Invalid project ID'),
  body('name').optional().trim().notEmpty().withMessage('name cannot be blank'),
  body('description').optional().isString(),
  body('status')
    .optional()
    .isIn(['active', 'archived'])
    .withMessage('status must be one of: active, archived'),
];
