import logger from '../../config/logger';
import { Response } from 'express';
import { validationResult } from 'express-validator';
import { AuthenticatedRequest } from '../../types';
import * as notificationsService from './notifications.service';

// ─── GET /api/notifications ───────────────────────────────────────────────────

export async function listNotifications(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const notifications = await notificationsService.findNotificationsByUser(req.user!.id);
    res.json({ data: notifications });
  } catch (err) {
    logger.error('[notifications.controller] listNotifications error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── GET /api/notifications/unread-count ─────────────────────────────────────

export async function unreadCount(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const count = await notificationsService.countUnreadByUser(req.user!.id);
    res.json({ data: { count } });
  } catch (err) {
    logger.error('[notifications.controller] unreadCount error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── PATCH /api/notifications/:id/read ───────────────────────────────────────

export async function markRead(req: AuthenticatedRequest, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: errors.array().map(e => e.msg).join(', ') });
    return;
  }

  const { id } = req.params;

  try {
    await notificationsService.markNotificationRead(id, req.user!.id);
    res.json({ message: 'Marked as read' });
  } catch (err) {
    logger.error('[notifications.controller] markRead error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── PATCH /api/notifications/read-all ───────────────────────────────────────

export async function markAllRead(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    await notificationsService.markAllNotificationsRead(req.user!.id);
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    logger.error('[notifications.controller] markAllRead error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
