import { body, query } from 'express-validator';

// Validation for GET /api/auth/onboarding/validate?token=…
export const validateTokenValidation = [
  query('token').notEmpty().withMessage('token is required'),
];

// Validation for POST /api/auth/onboarding/complete
export const completeOnboardingValidation = [
  body('token').notEmpty().withMessage('token is required'),
  body('first_name').trim().notEmpty().matches(/[a-zA-Z]/).withMessage('First name must contain at least one letter'),
  body('last_name').trim().notEmpty().matches(/[a-zA-Z]/).withMessage('Last name must contain at least one letter'),
  body('phone_number')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .matches(/^\+[1-9]\d{6,14}$/)
    .withMessage('phone_number must be in E.164 format (e.g. +12025551234)'),
    
  body('avatar_url').optional(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('password must be at least 8 characters'),
  body('skills')
    .optional()
    .isArray()
    .withMessage('skills must be an array'),
  body('skills.*.skill_name')
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Each skill must have a skill_name'),
  body('skills.*.experience')
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .custom((val) => {
      if (val === null || val === undefined || val === '') return true;
      const n = Number(val);
      if (isNaN(n) || n < 1 || n > 50) throw new Error('Experience must be a number between 1 and 50');
      return true;
    }),
  body('pending_skills')
    .optional()
    .isArray()
    .withMessage('pending_skills must be an array'),
  body('pending_skills.*')
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Each pending skill must be a non-empty string'),
];

// Validation for POST /api/auth/onboarding/avatar
export const uploadAvatarValidation = [
  body('token').notEmpty().withMessage('token is required'),
  body('image')
    .notEmpty().withMessage('image is required')
    .isString().withMessage('image must be a base64 string'),
];
