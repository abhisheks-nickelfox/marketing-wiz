import logger from '../../config/logger';
import { Notification, User } from '../../models';
import { QueryTypes } from 'sequelize';
import sequelize from '../../config/database';
import { broadcastToUser } from '../messages/sse';

// ── Types ────────────────────────────────────────────────────────────────────

export interface NotificationActor {
  id:         string;
  name:       string;
  avatar_url: string | null;
}

export interface NotificationRow {
  id:                 string;
  user_id:            string;
  ticket_id:          string | null;
  scope:              string;
  scope_id:           string | null;
  actor_id:           string | null;
  message_id:         string | null;
  title:              string;
  message:            string;
  read:               boolean;
  created_at:         string;
  updated_at:         string | null;
  actor:              NotificationActor | null;
  is_sub_task:        boolean;
  parent_task_title:  string | null;
  project_name:       string | null;
  firm_name:          string | null;
}

// ── Service methods ──────────────────────────────────────────────────────────

export async function findNotificationsByUser(userId: string): Promise<NotificationRow[]> {
  // Gmail-style: sort by the latest message in each conversation (scope), not just
  // the last @mention time.  The CTE fetches the newest non-deleted message per
  // scope_id so the preview text and ordering always reflect true last activity.
  const rows = await sequelize.query<{
    id: string; user_id: string; ticket_id: string | null; scope: string; scope_id: string | null;
    actor_id: string | null; message_id: string | null; title: string | null; message: string;
    read: boolean; created_at: string; updated_at: string | null;
    actor_user_id: string | null; actor_name: string | null; actor_avatar: string | null;
    is_sub_task: boolean; parent_task_title: string | null;
    project_name: string | null; firm_name: string | null;
  }>(
    `WITH latest_msg AS (
       SELECT DISTINCT ON (scope_id)
         scope_id,
         body       AS msg_body,
         user_id    AS msg_user_id,
         created_at AS msg_at
       FROM messages
       WHERE deleted_at IS NULL
       ORDER BY scope_id, created_at DESC
     ),
     task_ctx AS (
       SELECT
         t.id            AS task_id,
         t.parent_task_id,
         parent.title    AS parent_task_title,
         t.project_id,
         t.firm_id       AS task_firm_id
       FROM tickets t
       LEFT JOIN tickets parent ON parent.id = t.parent_task_id
     )
     SELECT
       n.id, n.user_id, n.ticket_id, n.scope, n.scope_id,
       n.actor_id, n.message_id, n.title,
       COALESCE(lm.msg_body, n.message)                         AS message,
       n.read, n.created_at,
       COALESCE(lm.msg_at, n.updated_at, n.created_at)         AS updated_at,
       u.id         AS actor_user_id,
       u.name       AS actor_name,
       u.avatar_url AS actor_avatar,
       (n.scope = 'task' AND tc.parent_task_id IS NOT NULL)     AS is_sub_task,
       CASE WHEN n.scope = 'task' THEN tc.parent_task_title END AS parent_task_title,
       CASE
         WHEN n.scope = 'task'    THEN proj_t.name
         WHEN n.scope = 'project' THEN proj_p.name
       END                                                       AS project_name,
       CASE
         WHEN n.scope = 'task'    THEN firm_t.name
         WHEN n.scope = 'project' THEN firm_p.name
         WHEN n.scope = 'firm'    THEN firm_f.name
       END                                                       AS firm_name
     FROM notifications n
     LEFT JOIN latest_msg lm   ON lm.scope_id = n.scope_id
     LEFT JOIN users u         ON u.id = COALESCE(lm.msg_user_id, n.actor_id)
     LEFT JOIN task_ctx tc     ON tc.task_id = n.scope_id AND n.scope = 'task'
     LEFT JOIN projects proj_t ON proj_t.id = tc.project_id
     LEFT JOIN firms firm_t    ON firm_t.id = tc.task_firm_id
     LEFT JOIN projects proj_p ON proj_p.id = n.scope_id AND n.scope = 'project'
     LEFT JOIN firms firm_p    ON firm_p.id = proj_p.firm_id
     LEFT JOIN firms firm_f    ON firm_f.id = n.scope_id AND n.scope = 'firm'
     WHERE n.user_id = :userId
     ORDER BY COALESCE(lm.msg_at, n.updated_at, n.created_at) DESC NULLS LAST
     LIMIT 30`,
    { replacements: { userId }, type: QueryTypes.SELECT },
  );

  return rows.map((r) => ({
    id:                r.id,
    user_id:           r.user_id,
    ticket_id:         r.ticket_id,
    scope:             r.scope ?? 'task',
    scope_id:          r.scope_id ?? null,
    actor_id:          r.actor_id,
    message_id:        r.message_id ?? null,
    title:             r.title ?? '',
    message:           r.message,
    read:              r.read,
    created_at:        r.created_at,
    updated_at:        r.updated_at ?? null,
    actor:             r.actor_user_id ? {
      id:         r.actor_user_id,
      name:       r.actor_name ?? '',
      avatar_url: r.actor_avatar ?? null,
    } : null,
    is_sub_task:       r.is_sub_task ?? false,
    parent_task_title: r.parent_task_title ?? null,
    project_name:      r.project_name ?? null,
    firm_name:         r.firm_name ?? null,
  }));
}

export async function countUnreadByUser(userId: string): Promise<number> {
  return Notification.count({
    where: { user_id: userId, read: false },
  });
}

export async function clearNotification(id: string, userId: string): Promise<void> {
  await Notification.destroy({ where: { id, user_id: userId } });
}

export async function clearAllNotifications(userId: string): Promise<void> {
  await Notification.destroy({ where: { user_id: userId } });
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
    where: { role: 'admin' },
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
    for (const { id } of admins as unknown as { id: string }[]) {
      broadcastToUser(id, { type: 'notification_update' });
    }
  } catch (err) {
    logger.error('[notifications.service] notifyAdmins — insert error:', err);
  }
}

/**
 * Creates an inbox notification for a single user.
 * Fire-and-forget safe — errors are logged but not re-thrown.
 */
export async function notifyUser(
  userId:     string,
  title:      string,
  message:    string,
  actorId?:   string,
  type       = 'general',
  scope      = 'task',
  scopeId?:   string,
  messageId?: string,
): Promise<void> {
  try {
    const now   = new Date().toISOString();
    const notif = await Notification.create({
      user_id:    userId,
      actor_id:   actorId   ?? null,
      message_id: messageId ?? null,
      title,
      message,
      read:     false,
      type,
      scope,
      scope_id: scopeId ?? null,
    });
    const notifId = (notif as unknown as { id: string }).id;

    // Fetch actor name + avatar so the frontend can render immediately
    let actor: { id: string; name: string; avatar_url: string | null } | null = null;
    if (actorId) {
      const u = await User.findByPk(actorId, {
        attributes: ['id', 'name', 'avatar_url'],
        raw: true,
      }) as unknown as { id: string; name: string; avatar_url: string | null } | null;
      if (u) actor = u;
    }

    // Send the full notification payload so the client can update cache directly
    // without waiting for a refetch round-trip.
    broadcastToUser(userId, {
      type: 'notification_update',
      notification: {
        id:                notifId,
        user_id:           userId,
        ticket_id:         null,
        scope,
        scope_id:          scopeId          ?? null,
        actor_id:          actorId          ?? null,
        message_id:        messageId        ?? null,
        title,
        message,
        read:              false,
        created_at:        now,
        updated_at:        now,
        actor,
        is_sub_task:       false,
        parent_task_title: null,
        project_name:      null,
        firm_name:         null,
      },
    });
  } catch (err) {
    logger.error('[notifications.service] notifyUser error:', err);
  }
}
