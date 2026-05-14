import { body } from 'express-validator';

export const createSkillValidation = [
  body('name').trim().notEmpty().matches(/[a-zA-Z]/).withMessage('Skill name must contain at least one letter'),
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
    .matches(/[a-zA-Z]/)
    .withMessage('Skill name must contain at least one letter'),
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
