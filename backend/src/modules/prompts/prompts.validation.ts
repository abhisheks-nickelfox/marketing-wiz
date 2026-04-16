import { body, param } from 'express-validator';

export const createPromptValidation = [
  body('name').notEmpty().withMessage('Prompt name is required'),
  body('type')
    .isIn(['pm', 'campaigns', 'content'])
    .withMessage('type must be pm | campaigns | content'),
  body('system_prompt').notEmpty().withMessage('system_prompt is required'),
  body('firm_id').optional().isUUID('loose').withMessage('firm_id must be a valid UUID'),
  body('is_active').optional().isBoolean(),
];

export const updatePromptValidation = [
  param('id').isUUID('loose').withMessage('Invalid prompt ID'),
  body('name').optional().notEmpty().withMessage('Name cannot be blank'),
  body('type')
    .optional()
    .isIn(['pm', 'campaigns', 'content'])
    .withMessage('type must be pm | campaigns | content'),
  body('system_prompt').optional().notEmpty().withMessage('system_prompt cannot be blank'),
  body('firm_id').optional().isUUID('loose').withMessage('firm_id must be a valid UUID'),
  body('is_active').optional().isBoolean(),
];
