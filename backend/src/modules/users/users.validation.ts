import { body } from 'express-validator';

export const createUserValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),
  body('role')
    .optional()
    .isIn(['admin', 'member'])
    .withMessage('Role must be admin or member'),
  body('member_role')
    .optional()
    .isString()
    .withMessage('member_role must be a string'),
  body('permissions')
    .optional()
    .isArray()
    .withMessage('Permissions must be an array'),
  body('skill_ids')
    .optional()
    .isArray()
    .withMessage('skill_ids must be an array'),
  body('skill_ids.*')
    .optional()
    .isUUID()
    .withMessage('Each skill_id must be a valid UUID'),
  body('status')
    .optional()
    .isIn(['Active', 'invited', 'Disabled'])
    .withMessage('Status must be Active, invited, or Disabled'),
];

export const updateUserValidation = [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be blank'),
  body('password')
    .optional()
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),
  body('role')
    .optional()
    .isIn(['admin', 'member'])
    .withMessage('Role must be admin or member'),
  body('member_role')
    .optional()
    .isString()
    .withMessage('member_role must be a string'),
  body('permissions')
    .optional()
    .isArray()
    .withMessage('Permissions must be an array'),
  body('skill_ids')
    .optional()
    .isArray()
    .withMessage('skill_ids must be an array'),
  body('skill_ids.*')
    .optional()
    .isUUID()
    .withMessage('Each skill_id must be a valid UUID'),
  body('status')
    .optional()
    .isIn(['Active', 'invited', 'Disabled'])
    .withMessage('Status must be Active, invited, or Disabled'),
];
