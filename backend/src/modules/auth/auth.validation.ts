import { body } from 'express-validator';

// Validation for POST /api/auth/login
export const loginValidation = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

// Validation for PATCH /api/auth/profile
export const updateProfileValidation = [
  body('name').notEmpty().withMessage('Name is required').isString(),
];

// Validation for POST /api/auth/forgot-password
export const forgotPasswordValidation = [
  body('email').isEmail().withMessage('Valid email is required'),
];

// Validation for POST /api/auth/reset-password
export const resetPasswordValidation = [
  body('token').notEmpty().withMessage('token is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('password must be at least 8 characters'),
];
