import { body, query } from 'express-validator';

export const listTeamValidation = [
  query('role')
    .optional()
    .isIn(['member', 'admin', 'super_admin'])
    .withMessage('Invalid role value'),
];

export const createTeamMemberValidation = [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),
  body('role')
    .optional()
    .isIn(['admin', 'member'])
    .withMessage('Role must be admin or member'),
  body('permissions')
    .optional()
    .isArray()
    .withMessage('Permissions must be an array'),
];

export const updateTeamMemberValidation = [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be blank'),
  body('password')
    .optional()
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),
  body('role')
    .optional()
    .isIn(['admin', 'member'])
    .withMessage('Role must be admin or member'),
  body('permissions')
    .optional()
    .isArray()
    .withMessage('Permissions must be an array'),
];
