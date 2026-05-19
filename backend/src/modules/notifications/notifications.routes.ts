import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { notificationIdValidation } from './notifications.validation';
import * as notificationsController from './notifications.controller';

const router = Router();

// GET /api/notifications/stream — SSE; auth via ?token= query param
// Must be before router.use(authenticate) because EventSource cannot set headers.
router.get('/stream', notificationsController.streamNotifications);

// All other notification routes require a valid JWT
router.use(authenticate);

// GET  /api/notifications
router.get('/', notificationsController.listNotifications);

// GET  /api/notifications/unread-count
router.get('/unread-count', notificationsController.unreadCount);

// PATCH /api/notifications/read-all  (must be before /:id to avoid routing conflict)
router.patch('/read-all', notificationsController.markAllRead);

// PATCH /api/notifications/:id/read
router.patch('/:id/read', notificationIdValidation, notificationsController.markRead);

// DELETE /api/notifications  — clear all notifications for the current user
router.delete('/', notificationsController.clearAll);

// DELETE /api/notifications/:id — clear a single notification
router.delete('/:id', notificationIdValidation, notificationsController.clearOne);

export default router;
