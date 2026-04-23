import { body, param } from 'express-validator';
import { MIN_TIME_LOG_HOURS, MAX_TIME_LOG_HOURS } from '../../config/constants';

// Member-creatable log types — 'revision' and 'transition' are system-only
const MEMBER_LOG_TYPES = ['estimate', 'partial', 'final', 'revision'] as const;

export const createTimeLogValidation = [
  param('id').isUUID('loose').withMessage('Invalid ticket ID'),
  body('hours')
    .isFloat({ min: MIN_TIME_LOG_HOURS })
    .withMessage(`Hours must be at least ${MIN_TIME_LOG_HOURS}`),
  body('comment').optional().isString(),
  body('log_type')
    .isIn(MEMBER_LOG_TYPES)
    .withMessage(`log_type must be one of: ${MEMBER_LOG_TYPES.join(', ')}`),
];

export const updateTimeLogValidation = [
  param('id').isUUID('loose').withMessage('Invalid ticket ID'),
  param('logId').isUUID('loose').withMessage('Invalid log ID'),
  body('hours')
    .isFloat({ min: MIN_TIME_LOG_HOURS, max: MAX_TIME_LOG_HOURS })
    .withMessage(`Hours must be between ${MIN_TIME_LOG_HOURS} and ${MAX_TIME_LOG_HOURS}`),
  body('comment').optional().isString(),
];

export const deleteTimeLogValidation = [
  param('id').isUUID('loose').withMessage('Invalid ticket ID'),
  param('logId').isUUID('loose').withMessage('Invalid log ID'),
];
