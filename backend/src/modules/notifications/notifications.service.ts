import logger from '../../config/logger';
import supabase from '../../config/supabase';

// ── Types ────────────────────────────────────────────────────────────────────

export interface Notification {
  id: string;
  user_id: string;
  ticket_id: string | null;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

// ── Service methods ──────────────────────────────────────────────────────────

export async function findNotificationsByUser(userId: string): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) {
    logger.error('[notifications.service] findNotificationsByUser error:', error);
    throw new Error(error.message);
  }

  return (data ?? []) as Notification[];
}

export async function countUnreadByUser(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('read', false);

  if (error) {
    logger.error('[notifications.service] countUnreadByUser error:', error);
    throw new Error(error.message);
  }

  return count ?? 0;
}

export async function markNotificationRead(notificationId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId)
    .eq('user_id', userId); // ownership guard — members can only mark their own

  if (error) {
    logger.error('[notifications.service] markNotificationRead error:', error);
    throw new Error(error.message);
  }
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false);

  if (error) {
    logger.error('[notifications.service] markAllNotificationsRead error:', error);
    throw new Error(error.message);
  }
}

/**
 * Creates an inbox notification for every admin / super_admin user.
 * Used for events that require admin attention (e.g. pending skill requests).
 */
export async function notifyAdmins(message: string, type: string): Promise<void> {
  const { data: admins, error: adminErr } = await supabase
    .from('users')
    .select('id')
    .in('role', ['admin', 'super_admin']);

  if (adminErr) {
    logger.error('[notifications.service] notifyAdmins — fetch admins error:', adminErr);
    return;
  }

  if (!admins || admins.length === 0) return;

  const title =
    type === 'skill_request'
      ? 'New skill request'
      : 'Admin notification';

  const rows = (admins as { id: string }[]).map((a) => ({
    user_id: a.id,
    title,
    message,
    read: false,
  }));

  const { error: insertErr } = await supabase.from('notifications').insert(rows);
  if (insertErr) {
    logger.error('[notifications.service] notifyAdmins — insert error:', insertErr);
  }
}
