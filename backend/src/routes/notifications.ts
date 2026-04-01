import { Router } from 'express';
import { param } from 'express-validator';
import { authenticate } from '../middleware/auth';
import {
  listNotifications,
  unreadCount,
  markRead,
  markAllRead,
} from '../controllers/notifications.controller';

const router = Router();

const notificationIdValidation = [
  param('id').isUUID('loose').withMessage('Invalid notification ID'),
];

router.get('/', authenticate, listNotifications);
router.get('/unread-count', authenticate, unreadCount);
router.patch('/read-all', authenticate, markAllRead);
router.patch('/:id/read', authenticate, notificationIdValidation, markRead);

export default router;
