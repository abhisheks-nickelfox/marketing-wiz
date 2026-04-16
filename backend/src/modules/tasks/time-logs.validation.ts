import { body, param } from 'express-validator';

export const createTimeLogValidation = [
  param('id').isUUID('loose').withMessage('Invalid ticket ID'),
  body('hours').isFloat({ min: 0.01 }).withMessage('Hours must be a positive number'),
  body('comment').optional().isString(),
  body('log_type')
    .isIn(['estimate', 'partial', 'final', 'revision'])
    .withMessage('log_type must be estimate | partial | final | revision'),
];

export const updateTimeLogValidation = [
  param('id').isUUID('loose').withMessage('Invalid ticket ID'),
  param('logId').isUUID('loose').withMessage('Invalid log ID'),
  body('hours').isFloat({ min: 0.01, max: 999.99 }).withMessage('Hours must be between 0.01 and 999.99'),
  body('comment').optional().isString(),
];

export const deleteTimeLogValidation = [
  param('id').isUUID('loose').withMessage('Invalid ticket ID'),
  param('logId').isUUID('loose').withMessage('Invalid log ID'),
];
