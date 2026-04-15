import { body } from 'express-validator';

export const createSkillValidation = [
  body('name').trim().notEmpty().withMessage('Skill name is required'),
  body('category')
    .optional()
    .isString()
    .withMessage('Category must be a string'),
];
