import { body } from 'express-validator';

export const createMemberRoleValidation = [
  body('name').trim().notEmpty().withMessage('Role name is required'),
];
