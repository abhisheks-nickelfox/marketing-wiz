import { param } from 'express-validator';

export const notificationIdValidation = [
  param('id').isUUID('loose').withMessage('Invalid notification ID'),
];
