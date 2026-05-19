import logger from '../../config/logger';
import { Response } from 'express';
import { validationResult } from 'express-validator';
import { AuthenticatedRequest } from '../../types';
import { User } from '../../models';
import { verifyToken } from '../../config/auth';
import { subscribe } from '../messages/sse';
import * as notificationsService from './notifications.service';

// ─── GET /api/notifications/stream?token=Z ───────────────────────────────────
//
// SSE endpoint — one persistent connection per logged-in user.
// The frontend opens this when AppLayout mounts and keeps it alive.
// Whenever a notification is written for this user the backend calls
// broadcastToUser(userId, { type: 'notification_update' }) which wakes up
// the frontend to re-fetch the notifications list.

export async function streamNotifications(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { token } = req.query as { token?: string };

  if (!token) { res.status(401).json({ error: 'Missing token' }); return; }

  let userId: string;
  try {
    const payload = verifyToken(token);
    userId = payload.sub;
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  const profile = await User.findByPk(userId, { raw: true });
  if (!profile) { res.status(401).json({ error: 'User not found' }); return; }

  res.setHeader('Content-Type',  'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection',    'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const send = (data: string) => {
    res.write(data);
    (res as unknown as { flush?: () => void }).flush?.();
  };

  send(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);

  const unsubscribe = subscribe('user', userId, res);
  const heartbeat   = setInterval(() => send(': heartbeat\n\n'), 30_000);

  req.on('close', () => {
    clearInterval(heartbeat);
    unsubscribe();
  });
}

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

// ─── DELETE /api/notifications/:id ───────────────────────────────────────────

export async function clearOne(req: AuthenticatedRequest, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: errors.array().map(e => e.msg).join(', ') });
    return;
  }
  try {
    await notificationsService.clearNotification(req.params.id, req.user!.id);
    res.json({ message: 'Notification cleared' });
  } catch (err) {
    logger.error('[notifications.controller] clearOne error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── DELETE /api/notifications ────────────────────────────────────────────────

export async function clearAll(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    await notificationsService.clearAllNotifications(req.user!.id);
    res.json({ message: 'All notifications cleared' });
  } catch (err) {
    logger.error('[notifications.controller] clearAll error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
