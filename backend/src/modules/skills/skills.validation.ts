import { body } from 'express-validator';

export const createSkillValidation = [
  body('name').trim().notEmpty().withMessage('Skill name is required'),
  body('category')
    .optional({ nullable: true, checkFalsy: true })
    .isString().trim()
    .withMessage('Category must be a string'),
  body('description')
    .optional({ nullable: true, checkFalsy: true })
    .isString().trim().isLength({ max: 500 })
    .withMessage('Description must be a string (max 500 characters)'),
  body('color')
    .optional({ nullable: true, checkFalsy: true })
    .isString().trim()
    .withMessage('Color must be a string'),
];

export const updateSkillValidation = [
  body('name')
    .optional()
    .trim().notEmpty()
    .withMessage('Skill name cannot be empty'),
  body('category')
    .optional({ nullable: true, checkFalsy: true })
    .isString().trim()
    .withMessage('Category must be a string'),
  body('description')
    .optional({ nullable: true, checkFalsy: true })
    .isString().trim().isLength({ max: 500 })
    .withMessage('Description must be a string (max 500 characters)'),
  body('color')
    .optional({ nullable: true, checkFalsy: true })
    .isString().trim()
    .withMessage('Color must be a string'),
];
