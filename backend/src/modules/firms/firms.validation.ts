import { body, param } from 'express-validator';

const OPT = { nullable: true } as const;

export const createFirmValidation = [
  body('name').trim().notEmpty().matches(/[a-zA-Z]/).withMessage('Firm name must contain at least one letter'),
  body('location').optional(OPT).isString(),
  body('website').optional(OPT).isString(),
  body('logo_url').optional(OPT).isString(),
  body('description').optional(OPT).isString(),
  body('contact_name').optional(OPT).isString().matches(/[a-zA-Z]/).withMessage('Contact name must contain at least one letter'),
  body('contact_email').optional(OPT).isEmail().withMessage('Valid contact email required'),
  body('contact_role').optional(OPT).isString(),
  body('contact_phone').optional(OPT).isString(),
  body('account_manager_id').optional(OPT).isUUID('loose').withMessage('account_manager_id must be a UUID'),
  body('default_prompt_id').optional(OPT).isUUID('loose').withMessage('default_prompt_id must be a UUID'),
];

export const updateFirmValidation = [
  param('id').isUUID('loose').withMessage('Invalid firm ID'),
  body('name').optional(OPT).trim().notEmpty().matches(/[a-zA-Z]/).withMessage('Firm name must contain at least one letter'),
  body('location').optional(OPT).isString(),
  body('website').optional(OPT).isString(),
  body('logo_url').optional(OPT).isString(),
  body('description').optional(OPT).isString(),
  body('contact_name').optional(OPT).isString().matches(/[a-zA-Z]/).withMessage('Contact name must contain at least one letter'),
  body('contact_email').optional(OPT).isEmail().withMessage('Valid contact email required'),
  body('contact_role').optional(OPT).isString(),
  body('contact_phone').optional(OPT).isString(),
  body('account_manager_id').optional(OPT).isUUID('loose').withMessage('account_manager_id must be a UUID'),
  body('default_prompt_id').optional(OPT).isUUID('loose').withMessage('default_prompt_id must be a UUID'),
];
