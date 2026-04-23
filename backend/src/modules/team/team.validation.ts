import { body, query } from 'express-validator';
import { VALID_ROLES } from '../../config/constants';

export const listTeamValidation = [
  query('role')
    .optional()
    .isIn(VALID_ROLES)
    .withMessage(`role must be one of: ${VALID_ROLES.join(', ')}`),
];

export const createTeamMemberValidation = [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),
  body('role')
    .optional()
    .isIn(VALID_ROLES)
    .withMessage(`Role must be one of: ${VALID_ROLES.join(', ')}`),
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
    .isIn(VALID_ROLES)
    .withMessage(`Role must be one of: ${VALID_ROLES.join(', ')}`),
  body('permissions')
    .optional()
    .isArray()
    .withMessage('Permissions must be an array'),
];
