import { body, query } from 'express-validator';

export const loginValidation = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

export const updateProfileValidation = [
  body('name').notEmpty().withMessage('Name is required').isString(),
];

export const validateTokenValidation = [
  query('token').notEmpty().withMessage('token is required'),
];

export const completeOnboardingValidation = [
  body('token').notEmpty().withMessage('token is required'),
  body('first_name').notEmpty().trim().withMessage('first_name is required'),
  body('last_name').notEmpty().trim().withMessage('last_name is required'),
  body('phone_number').optional().trim(),
  body('avatar_url').optional(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('password must be at least 8 characters'),
];

export const uploadAvatarValidation = [
  body('token').notEmpty().withMessage('token is required'),
  body('image')
    .notEmpty().withMessage('image is required')
    .isString().withMessage('image must be a base64 string'),
];
