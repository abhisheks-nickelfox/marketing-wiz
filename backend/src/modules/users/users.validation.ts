import { body, param } from 'express-validator';
import { VALID_ROLES, VALID_USER_STATUSES } from '../../config/constants';

const nameLetterCheck = (field: string) =>
  body(field).optional().trim().notEmpty().matches(/[a-zA-Z]/).withMessage(`${field} must contain at least one letter`);

export const createUserValidation = [
  body('name').optional().trim().notEmpty().matches(/[a-zA-Z]/).withMessage('Name must contain at least one letter'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password')
    .optional()
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),
  body('role')
    .optional()
    .isIn(VALID_ROLES)
    .withMessage(`Role must be one of: ${VALID_ROLES.join(', ')}`),
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
    .isUUID('loose')
    .withMessage('Each skill_id must be a valid UUID'),
  body('status')
    .optional()
    .isIn(VALID_USER_STATUSES)
    .withMessage(`Status must be one of: ${VALID_USER_STATUSES.join(', ')}`),
  body('rate_amount')
    .optional({ nullable: true })
    .isFloat({ min: 0, max: 99999999.99 })
    .withMessage('rate_amount must be a number between 0 and 99,999,999.99'),
  body('rate_frequency')
    .optional({ nullable: true })
    .isIn(['Hourly', 'Daily', 'Weekly', 'Monthly'])
    .withMessage('rate_frequency must be one of: Hourly, Daily, Weekly, Monthly'),
];

export const updateUserValidation = [
  body('name').optional().trim().notEmpty().matches(/[a-zA-Z]/).withMessage('Name must contain at least one letter'),
  nameLetterCheck('first_name'),
  nameLetterCheck('last_name'),
  body('phone_number')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .matches(/^\+[1-9]\d{6,14}$/)
    .withMessage('phone_number must be in E.164 format (e.g. +12025551234)'),
  body('password')
    .optional()
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),
  body('role')
    .optional()
    .isIn(VALID_ROLES)
    .withMessage(`Role must be one of: ${VALID_ROLES.join(', ')}`),
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
    .isUUID('loose')
    .withMessage('Each skill_id must be a valid UUID'),
  body('status')
    .optional()
    .isIn(VALID_USER_STATUSES)
    .withMessage(`Status must be one of: ${VALID_USER_STATUSES.join(', ')}`),
  body('rate_amount')
    .optional({ nullable: true })
    .isFloat({ min: 0, max: 99999999.99 })
    .withMessage('rate_amount must be a number between 0 and 99,999,999.99'),
  body('rate_frequency')
    .optional({ nullable: true })
    .isIn(['Hourly', 'Daily', 'Weekly', 'Monthly'])
    .withMessage('rate_frequency must be one of: Hourly, Daily, Weekly, Monthly'),
  body('skills_with_experience')
    .optional()
    .isArray()
    .withMessage('skills_with_experience must be an array'),
  body('skills_with_experience.*.skill_id')
    .optional()
    .isUUID('loose')
    .withMessage('Each skill_id must be a valid UUID'),
  body('skills_with_experience.*.experience')
    .optional({ nullable: true })
    .custom((val) => {
      if (val === null || val === undefined || val === '') return true;
      const n = Number(val);
      if (isNaN(n) || n < 1 || n > 50) throw new Error('Experience must be a number between 1 and 50');
      return true;
    }),
];

export const uploadAvatarValidation = [
  param('id').isUUID('loose').withMessage('Invalid user ID'),
  body('image')
    .notEmpty().withMessage('image is required')
    .isString().withMessage('image must be a base64 data URL string'),
];
