import { body, query } from 'express-validator';

// Validation for GET /api/auth/onboarding/validate?token=…
export const validateTokenValidation = [
  query('token').notEmpty().withMessage('token is required'),
];

// Validation for POST /api/auth/onboarding/complete
export const completeOnboardingValidation = [
  body('token').notEmpty().withMessage('token is required'),
  body('first_name').notEmpty().trim().withMessage('first_name is required'),
  body('last_name').notEmpty().trim().withMessage('last_name is required'),
  body('phone_number')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .matches(/^\+[1-9]\d{6,14}$/)
    .withMessage('phone_number must be in E.164 format (e.g. +12025551234)'),
    
  body('avatar_url').optional(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('password must be at least 8 characters'),
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
