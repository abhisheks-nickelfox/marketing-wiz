import { body, param } from 'express-validator';

export const createFirmValidation = [
  body('name').notEmpty().withMessage('Firm name is required'),
  body('location').optional().isString(),
  body('website').optional().isString(),
  body('logo_url').optional({ nullable: true }).isString(),
  body('description').optional().isString(),
  body('contact_name').optional().isString(),
  body('contact_email').optional().isEmail().withMessage('Valid contact email required'),
  body('contact_role').optional().isString(),
  body('contact_phone').optional().isString(),
  body('account_manager_id')
    .optional({ nullable: true })
    .isUUID('loose')
    .withMessage('account_manager_id must be a UUID'),
  body('default_prompt_id')
    .optional({ nullable: true })
    .isUUID('loose')
    .withMessage('default_prompt_id must be a UUID'),
];

export const updateFirmValidation = [
  param('id').isUUID('loose').withMessage('Invalid firm ID'),
  body('name').optional().notEmpty().withMessage('Name cannot be blank'),
  body('location').optional().isString(),
  body('website').optional().isString(),
  body('logo_url').optional({ nullable: true }).isString(),
  body('description').optional().isString(),
  body('contact_name').optional().isString(),
  body('contact_email').optional().isEmail().withMessage('Valid contact email required'),
  body('contact_role').optional().isString(),
  body('contact_phone').optional().isString(),
  body('account_manager_id')
    .optional({ nullable: true })
    .isUUID('loose')
    .withMessage('account_manager_id must be a UUID'),
  body('default_prompt_id')
    .optional({ nullable: true })
    .isUUID('loose')
    .withMessage('default_prompt_id must be a UUID'),
];
