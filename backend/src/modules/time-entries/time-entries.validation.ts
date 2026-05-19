import { body, param } from 'express-validator';

export const createTimeEntryValidation = [
  body('started_at')
    .isISO8601()
    .withMessage('started_at must be a valid ISO8601 datetime'),
  body('ended_at')
    .optional()
    .isISO8601()
    .withMessage('ended_at must be a valid ISO8601 datetime'),
  body('duration_seconds')
    .optional()
    .isInt({ min: 1 })
    .withMessage('duration_seconds must be a positive integer'),
  body('description')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('description must be at most 1000 characters'),
];

export const updateTimeEntryValidation = [
  param('entryId').isUUID('loose').withMessage('Invalid entry ID'),
  body('started_at')
    .optional()
    .isISO8601()
    .withMessage('started_at must be a valid ISO8601 datetime'),
  body('ended_at')
    .optional()
    .isISO8601()
    .withMessage('ended_at must be a valid ISO8601 datetime'),
  body('duration_seconds')
    .optional()
    .isInt({ min: 1 })
    .withMessage('duration_seconds must be a positive integer'),
  body('description')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('description must be at most 1000 characters'),
];
