import logger from '../../config/logger';
import { Notification, User } from '../../models';
import { Op } from 'sequelize';

// ── Types ────────────────────────────────────────────────────────────────────

export interface NotificationRow {
  id: string;
  user_id: string;
  ticket_id: string | null;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

// ── Service methods ──────────────────────────────────────────────────────────

export async function findNotificationsByUser(userId: string): Promise<NotificationRow[]> {
  const rows = await Notification.findAll({
    where: { user_id: userId },
    order: [['created_at', 'DESC']],
    limit: 30,
    raw: true,
  });

  return rows as unknown as NotificationRow[];
}

export async function countUnreadByUser(userId: string): Promise<number> {
  return Notification.count({
    where: { user_id: userId, read: false },
  });
}

export async function markNotificationRead(notificationId: string, userId: string): Promise<void> {
  await Notification.update(
    { read: true },
    { where: { id: notificationId, user_id: userId } },
  );
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  await Notification.update(
    { read: true },
    { where: { user_id: userId, read: false } },
  );
}

/**
 * Creates an inbox notification for every admin user.
 * Used for events that require admin attention (e.g. pending skill requests).
 */
export async function notifyAdmins(message: string, type: string): Promise<void> {
  const admins = await User.findAll({
    where: { role: { [Op.in]: ['admin', 'super_admin'] } },
    attributes: ['id'],
    raw: true,
  });

  if (admins.length === 0) return;

  const title =
    type === 'skill_request' ? 'New skill request' :
    type === 'invite_sent'   ? 'Invite sent' :
    'Admin notification';

  const rows = (admins as unknown as { id: string }[]).map((a) => ({
    user_id: a.id,
    title,
    message,
    read: false,
  }));

  try {
    await Notification.bulkCreate(rows);
  } catch (err) {
    logger.error('[notifications.service] notifyAdmins — insert error:', err);
  }
}

/**
 * Creates an inbox notification for a single user.
 * Fire-and-forget safe — errors are logged but not re-thrown.
 */
export async function notifyUser(userId: string, title: string, message: string): Promise<void> {
  try {
    await Notification.create({ user_id: userId, title, message, read: false });
  } catch (err) {
    logger.error('[notifications.service] notifyUser error:', err);
  }
}
