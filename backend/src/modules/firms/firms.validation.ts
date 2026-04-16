import { body, param } from 'express-validator';

export const createFirmValidation = [
  body('name').notEmpty().withMessage('Firm name is required'),
  body('contact_name').optional().isString(),
  body('contact_email').optional().isEmail().withMessage('Valid contact email required'),
  body('default_prompt_id').optional().isUUID('loose').withMessage('default_prompt_id must be a UUID'),
];

export const updateFirmValidation = [
  param('id').isUUID('loose').withMessage('Invalid firm ID'),
  body('name').optional().notEmpty().withMessage('Name cannot be blank'),
  body('contact_name').optional().isString(),
  body('contact_email').optional().isEmail().withMessage('Valid contact email required'),
  body('default_prompt_id').optional().isUUID('loose').withMessage('default_prompt_id must be a UUID'),
];
