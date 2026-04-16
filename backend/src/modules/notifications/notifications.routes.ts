import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { notificationIdValidation } from './notifications.validation';
import * as notificationsController from './notifications.controller';

const router = Router();

// All notification routes require authentication (member-level)
router.use(authenticate);

// GET  /api/notifications
router.get('/', notificationsController.listNotifications);

// GET  /api/notifications/unread-count
router.get('/unread-count', notificationsController.unreadCount);

// PATCH /api/notifications/read-all  (must be before /:id to avoid routing conflict)
router.patch('/read-all', notificationsController.markAllRead);

// PATCH /api/notifications/:id/read
router.patch('/:id/read', notificationIdValidation, notificationsController.markRead);

export default router;
