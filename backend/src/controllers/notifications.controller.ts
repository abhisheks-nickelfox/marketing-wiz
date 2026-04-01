import { Response } from 'express';
import { validationResult } from 'express-validator';
import supabase from '../config/supabase';
import { AuthenticatedRequest } from '../types';

// ─── GET /api/notifications ───────────────────────────────────────────────────

export async function listNotifications(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(30);

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.json({ data: data ?? [] });
  } catch (err) {
    console.error('[notifications.controller] listNotifications error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── GET /api/notifications/unread-count ─────────────────────────────────────

export async function unreadCount(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', req.user.id)
      .eq('read', false);

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.json({ data: { count: count ?? 0 } });
  } catch (err) {
    console.error('[notifications.controller] unreadCount error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── PATCH /api/notifications/:id/read ───────────────────────────────────────

export async function markRead(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: errors.array().map(e => e.msg).join(', ') });
    return;
  }

  const { id } = req.params;

  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id)
      .eq('user_id', req.user.id); // ensure ownership

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.json({ message: 'Marked as read' });
  } catch (err) {
    console.error('[notifications.controller] markRead error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── PATCH /api/notifications/read-all ───────────────────────────────────────

export async function markAllRead(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', req.user.id)
      .eq('read', false);

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    console.error('[notifications.controller] markAllRead error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
