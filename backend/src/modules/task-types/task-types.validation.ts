import { body } from 'express-validator';

export const createTaskTypeValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('description').optional({ nullable: true, checkFalsy: true }).isString().trim(),
  body('color').optional({ nullable: true, checkFalsy: true }).isString().trim(),
  body('member_ids').optional().isArray().withMessage('member_ids must be an array'),
  body('member_ids.*').optional().isUUID('loose').withMessage('Each member_id must be a valid UUID'),
];

export const updateTaskTypeValidation = [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('description').optional({ nullable: true, checkFalsy: true }).isString().trim(),
  body('color').optional({ nullable: true, checkFalsy: true }).isString().trim(),
  body('member_ids').optional().isArray().withMessage('member_ids must be an array'),
  body('member_ids.*').optional().isUUID('loose').withMessage('Each member_id must be a valid UUID'),
];
