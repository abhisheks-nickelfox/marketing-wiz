import { Op, QueryTypes } from 'sequelize';
import { Message, MessageReaction, MessageRead, User, Notification, Firm, Project, Ticket, MessageScopeParticipant } from '../../models';
import sequelize from '../../config/database';
import type { CreateMessageDto } from './dto/create-message.dto';
import logger from '../../config/logger';
import { broadcastToUser } from './sse';

// ── Types ────────────────────────────────────────────────────────────────────

export interface ReactionSummary {
  emoji: string;
  count: number;
  /** IDs of users who added this reaction. */
  users: string[];
}

export interface EnrichedMessage {
  id:         string;
  scope:      string;
  scope_id:   string;
  user_id:    string;
  parent_id:  string | null;
  body:       string;
  is_system:  boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  author: {
    id:         string;
    name:       string;
    avatar_url: string | null;
  };
  reactions: ReactionSummary[];
  /** IDs of users who have read this message */
  read_by: string[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Given a list of message IDs, fetch all reactions from message_reactions and
 * group them into a per-message map of emoji → { count, users[] }.
 */
async function buildReactionMap(
  messageIds: string[],
): Promise<Record<string, ReactionSummary[]>> {
  if (messageIds.length === 0) return {};

  const rows = await MessageReaction.findAll({
    where: { message_id: { [Op.in]: messageIds } },
    attributes: ['message_id', 'user_id', 'emoji'],
    raw: true,
  }) as unknown as { message_id: string; user_id: string; emoji: string }[];

  // Group: messageId → emoji → { count, users }
  const map: Record<string, Record<string, { count: number; users: string[] }>> = {};

  for (const row of rows) {
    if (!map[row.message_id]) map[row.message_id] = {};
    if (!map[row.message_id][row.emoji]) {
      map[row.message_id][row.emoji] = { count: 0, users: [] };
    }
    map[row.message_id][row.emoji].count += 1;
    map[row.message_id][row.emoji].users.push(row.user_id);
  }

  // Flatten to array form per message
  const result: Record<string, ReactionSummary[]> = {};
  for (const [msgId, emojiMap] of Object.entries(map)) {
    result[msgId] = Object.entries(emojiMap).map(([emoji, { count, users }]) => ({
      emoji,
      count,
      users,
    }));
  }
  return result;
}

/**
 * Fetch the current reactions array for a single message.
 * Used after add/remove to return the updated state.
 */
async function getReactionsForMessage(messageId: string): Promise<ReactionSummary[]> {
  const map = await buildReactionMap([messageId]);
  return map[messageId] ?? [];
}

/**
 * Given a list of message IDs, return a map of messageId → userId[] of readers.
 */
async function buildReadMap(messageIds: string[]): Promise<Record<string, string[]>> {
  if (messageIds.length === 0) return {};

  const rows = await MessageRead.findAll({
    where: { message_id: { [Op.in]: messageIds } },
    attributes: ['message_id', 'user_id'],
    raw: true,
  }) as unknown as { message_id: string; user_id: string }[];

  const map: Record<string, string[]> = {};
  for (const row of rows) {
    if (!map[row.message_id]) map[row.message_id] = [];
    map[row.message_id].push(row.user_id);
  }
  return map;
}

// ── Service methods ──────────────────────────────────────────────────────────

/**
 * Fetch all non-deleted messages for a given scope + scope_id, ordered by
 * created_at ASC. Includes the author (id, name, avatar_url) and an
 * aggregated reactions summary.
 */
export async function getMessages(
  scope: string,
  scopeId: string,
): Promise<EnrichedMessage[]> {
  // Query 1: fetch messages with author join
  const messages = await Message.findAll({
    where: {
      scope,
      scope_id: scopeId,
      deleted_at: null,
    },
    include: [
      {
        model: User,
        as: 'author',
        attributes: ['id', 'name', 'avatar_url'],
        required: true,
      },
    ],
    order: [['created_at', 'ASC']],
    raw: false,
  });

  if (messages.length === 0) return [];

  const messageIds = messages.map((m) => m.id);

  // Batch-fetch reactions and read receipts in parallel
  const [reactionMap, readMap] = await Promise.all([
    buildReactionMap(messageIds),
    buildReadMap(messageIds),
  ]);

  return messages.map((m) => {
    const raw = m.toJSON() as unknown as Record<string, unknown>;
    const author = raw['author'] as { id: string; name: string; avatar_url: string | null };
    return {
      id:         m.id,
      scope:      m.scope,
      scope_id:   m.scope_id,
      user_id:    m.user_id,
      parent_id:  m.parent_id,
      body:       m.body,
      is_system:  m.is_system,
      deleted_at: m.deleted_at,
      created_at: m.created_at,
      updated_at: m.updated_at,
      author: {
        id:         author.id,
        name:       author.name,
        avatar_url: author.avatar_url ?? null,
      },
      reactions: reactionMap[m.id] ?? [],
      read_by:   readMap[m.id]    ?? [],
    };
  });
}

/**
 * Resolve human-readable context and ticket_id from a message scope.
 * Returns { label, ticketId, contextName } — label is a verbose description,
 * contextName is the bare name used as the notification title.
 */
async function resolveScope(
  scope:   string,
  scopeId: string,
): Promise<{ label: string; ticketId: string | null; contextName: string }> {
  if (scope === 'firm') {
    const firm = await Firm.findByPk(scopeId, { attributes: ['name'], raw: true }) as unknown as { name: string } | null;
    const name = firm?.name ?? 'Unknown';
    return { label: `firm chat "${name}"`, ticketId: null, contextName: name };
  }

  if (scope === 'project') {
    const project = await Project.findByPk(scopeId, { attributes: ['name', 'firm_id'], raw: true }) as unknown as { name: string; firm_id: string } | null;
    const name = project?.name ?? 'Unknown';
    let label = `project "${name}"`;
    if (project?.firm_id) {
      const firm = await Firm.findByPk(project.firm_id, { attributes: ['name'], raw: true }) as unknown as { name: string } | null;
      if (firm) label += ` (${firm.name})`;
    }
    return { label, ticketId: null, contextName: name };
  }

  if (scope === 'task') {
    const task = await Ticket.findByPk(scopeId, { attributes: ['title', 'firm_id', 'parent_task_id'], raw: true }) as unknown as { title: string; firm_id: string; parent_task_id: string | null } | null;
    const name = task?.title ?? 'Unknown';
    const isSubTask = !!task?.parent_task_id;
    let label = `${isSubTask ? 'sub-task' : 'task'} "${name}"`;
    if (task?.firm_id) {
      const firm = await Firm.findByPk(task.firm_id, { attributes: ['name'], raw: true }) as unknown as { name: string } | null;
      if (firm) label += ` (${firm.name})`;
    }
    return { label, ticketId: scopeId, contextName: name };
  }

  return { label: 'a message', ticketId: null, contextName: 'Message' };
}

/**
 * Unified participant-aware notification dispatcher.
 *
 * On every non-system message:
 *  1. Extract @mention targets (case-insensitive first_name match).
 *  2. Identify the parent message author if this is a thread reply.
 *  3. Upsert the sender, mentioned users, and reply-target as scope participants.
 *  4. Fetch the full current participant list for the scope (excluding sender).
 *  5. Create one notification per recipient, using the highest-priority type
 *     (mention > reply > thread_reply).
 *
 * Fire-and-forget — caller wraps in .catch(() => {}).
 */
async function fireParticipantNotifications(
  senderId: string,
  message:  EnrichedMessage,
): Promise<void> {
  // System messages (status updates, assignments, etc.) never trigger inbox notifications.
  if (message.is_system) return;

  const { scope, scope_id, body, parent_id } = message;
  const messageId = message.id;

  // ── 1. Resolve @mention targets ───────────────────────────────────────────
  // Match @Word or @Word_Word (no spaces). iLike against first_name OR the
  // first word of `name` so users without first_name populated still match.
  const mentionMatches = [...body.matchAll(/@(\w+)/g)].map((m) => m[1]);
  let mentionedUserIds: string[] = [];
  if (mentionMatches.length > 0) {
    // Fetch all active users and match client-side to handle first_name fallback.
    const activeUsers = await User.findAll({
      where: { status: { [Op.notIn]: ['Disabled', 'invited'] } },
      attributes: ['id', 'first_name', 'name'],
      raw: true,
    }) as unknown as { id: string; first_name: string | null; name: string }[];

    const matchedIds = activeUsers
      .filter((u) => {
        const firstName = (u.first_name ?? u.name.split(' ')[0]).toLowerCase();
        return mentionMatches.some((m) => m.toLowerCase() === firstName);
      })
      .map((u) => u.id)
      .filter((id) => id !== senderId);

    mentionedUserIds = [...new Set(matchedIds)];
  }

  // ── 2. Resolve parent message author (direct reply target) ────────────────
  let replyTargetUserId: string | null = null;
  if (parent_id) {
    const parent = await Message.findByPk(parent_id, {
      attributes: ['user_id'],
      raw: true,
    }) as unknown as { user_id: string } | null;
    if (parent && parent.user_id !== senderId) {
      replyTargetUserId = parent.user_id;
    }
  }

  // ── 3. Upsert participants: sender + mentioned users + reply target ────────
  // ignoreDuplicates means a returning participant is a safe no-op.
  const newParticipants = [
    ...new Set([
      senderId,
      ...mentionedUserIds,
      ...(replyTargetUserId ? [replyTargetUserId] : []),
    ]),
  ];
  if (newParticipants.length > 0) {
    await MessageScopeParticipant.bulkCreate(
      newParticipants.map((uid) => ({ scope, scope_id, user_id: uid })),
      { ignoreDuplicates: true },
    );
  }

  // ── 4. Gmail-style: mark ALL existing scoped notifications as unread ─────────
  // Any new message (even without @mentions) makes the thread unread for every
  // participant who already has a notification row for this scope, except the sender.
  // Fetch the affected user_ids first so we can SSE-push them after the UPDATE.
  const scopedRecipients = await sequelize.query<{ user_id: string }>(
    `SELECT user_id FROM notifications WHERE scope_id = :scope_id AND user_id != :sender_id`,
    { replacements: { scope_id, sender_id: senderId }, type: QueryTypes.SELECT },
  );
  if (scopedRecipients.length > 0) {
    await sequelize.query(
      `UPDATE notifications SET read = false WHERE scope_id = :scope_id AND user_id != :sender_id`,
      { replacements: { scope_id, sender_id: senderId }, type: QueryTypes.UPDATE },
    );
    for (const { user_id } of scopedRecipients) {
      broadcastToUser(user_id, { type: 'notification_update' });
    }
  }

  // ── 5. @mention / reply targets — create or refresh their notification row ──
  // Users who are @mentioned or replied to get a fresh row (or an upserted one)
  // so they definitely appear in the inbox even if they haven't participated before.
  const toNotify = [
    ...new Set([
      ...mentionedUserIds,
      ...(replyTargetUserId ? [replyTargetUserId] : []),
    ]),
  ];

  if (toNotify.length === 0) return;

  // ── 6. Resolve scope context (firm/project/task label + ticket_id) ────────
  const { ticketId, contextName } = await resolveScope(scope, scope_id);

  // ── 7. Atomic upsert — one row per (user_id, scope_id) ──────────────────────
  const mentionedSet = new Set(mentionedUserIds);

  await Promise.all(
    toNotify.map(async (recipientId) => {
      const type = mentionedSet.has(recipientId) ? 'mention' : 'reply';

      await sequelize.query(
        `INSERT INTO notifications
           (id, user_id, scope_id, scope, ticket_id, actor_id, message_id, title, message, type, read, created_at, updated_at)
         VALUES
           (gen_random_uuid(), :user_id, :scope_id, :scope, :ticket_id, :actor_id, :message_id, :title, :message, :type, false, NOW(), NOW())
         ON CONFLICT (user_id, scope_id) WHERE scope_id IS NOT NULL
         DO UPDATE SET
           message    = EXCLUDED.message,
           actor_id   = EXCLUDED.actor_id,
           message_id = EXCLUDED.message_id,
           title      = EXCLUDED.title,
           type       = CASE WHEN notifications.type = 'mention' THEN 'mention' ELSE EXCLUDED.type END,
           read       = false,
           updated_at = NOW()`,
        {
          replacements: {
            user_id:    recipientId,
            scope_id,
            scope,
            ticket_id:  ticketId,
            actor_id:   senderId,
            message_id: messageId,
            title:      contextName,
            message:    body,
            type,
          },
          type: QueryTypes.INSERT,
        },
      );

      // Push SSE so this recipient's inbox updates instantly
      broadcastToUser(recipientId, { type: 'notification_update' });
    }),
  );
}

/**
 * Insert a new message and return it enriched with author info and an empty
 * reactions array.
 */
export async function createMessage(
  userId: string,
  dto: CreateMessageDto,
): Promise<EnrichedMessage> {
  const message = await Message.create({
    scope:     dto.scope,
    scope_id:  dto.scope_id,
    user_id:   userId,
    body:      dto.body.trim(),
    parent_id: dto.parent_id ?? null,
    is_system: dto.is_system ?? false,
  });

  // Re-fetch with author join to keep the response shape consistent
  const full = await Message.findByPk(message.id, {
    include: [
      {
        model: User,
        as: 'author',
        attributes: ['id', 'name', 'avatar_url'],
        required: true,
      },
    ],
    raw: false,
  });

  const raw    = full!.toJSON() as unknown as Record<string, unknown>;
  const author = raw['author'] as { id: string; name: string; avatar_url: string | null };

  const enrichedMessage: EnrichedMessage = {
    id:         full!.id,
    scope:      full!.scope,
    scope_id:   full!.scope_id,
    user_id:    full!.user_id,
    parent_id:  full!.parent_id,
    body:       full!.body,
    is_system:  full!.is_system,
    deleted_at: full!.deleted_at,
    created_at: full!.created_at,
    updated_at: full!.updated_at,
    author: {
      id:         author.id,
      name:       author.name,
      avatar_url: author.avatar_url ?? null,
    },
    reactions: [],
    read_by:   [],
  };

  // Non-blocking: track participants + notify all thread members
  fireParticipantNotifications(userId, enrichedMessage).catch((err) => {
    logger.error('[messages] fireParticipantNotifications failed:', err);
  });

  return enrichedMessage;
}

/**
 * Mark all messages in a scope as read by userId.
 * Returns the IDs of messages newly marked (so the caller can broadcast).
 */
export async function markRead(
  scope: string,
  scopeId: string,
  userId: string,
): Promise<string[]> {
  const messages = await Message.findAll({
    where: { scope, scope_id: scopeId, deleted_at: null },
    attributes: ['id'],
    raw: true,
  }) as unknown as { id: string }[];

  if (messages.length === 0) return [];

  const allIds = messages.map((m) => m.id);

  const alreadyRead = await MessageRead.findAll({
    where: { message_id: { [Op.in]: allIds }, user_id: userId },
    attributes: ['message_id'],
    raw: true,
  }) as unknown as { message_id: string }[];

  const alreadyReadSet = new Set(alreadyRead.map((r) => r.message_id));
  const newlyRead = allIds.filter((id) => !alreadyReadSet.has(id));

  if (newlyRead.length === 0) return [];

  await MessageRead.bulkCreate(
    newlyRead.map((message_id) => ({ message_id, user_id: userId })),
    { ignoreDuplicates: true },
  );

  return newlyRead;
}

/**
 * Upsert a reaction (ignoreDuplicates — same user adding the same emoji again
 * is a no-op). Returns the full updated reactions array for the message.
 */
export async function addReaction(
  messageId: string,
  userId: string,
  emoji: string,
): Promise<ReactionSummary[]> {
  await MessageReaction.bulkCreate(
    [{ message_id: messageId, user_id: userId, emoji }],
    { ignoreDuplicates: true },
  );

  return getReactionsForMessage(messageId);
}

/**
 * Delete a specific reaction by (message_id, user_id, emoji).
 * Returns the updated reactions array for the message.
 */
export async function removeReaction(
  messageId: string,
  userId: string,
  emoji: string,
): Promise<ReactionSummary[]> {
  await MessageReaction.destroy({
    where: { message_id: messageId, user_id: userId, emoji },
  });

  return getReactionsForMessage(messageId);
}

/**
 * Soft-delete a message by setting deleted_at = NOW().
 * Only the message author or an admin may delete.
 * Throws a 403-tagged error if the caller is not permitted.
 * Throws a 404-tagged error if the message does not exist.
 */
export async function deleteMessage(
  messageId: string,
  userId: string,
  isAdmin: boolean,
): Promise<{ scope: string; scope_id: string }> {
  const message = await Message.findByPk(messageId, {
    attributes: ['id', 'scope', 'scope_id', 'user_id', 'deleted_at'],
    raw: true,
  }) as unknown as { id: string; scope: string; scope_id: string; user_id: string; deleted_at: string | null } | null;

  if (!message) {
    throw Object.assign(new Error('Message not found'), { statusCode: 404 });
  }

  if (message.deleted_at !== null) {
    throw Object.assign(new Error('Message not found'), { statusCode: 404 });
  }

  if (!isAdmin && message.user_id !== userId) {
    throw Object.assign(new Error('You do not have permission to delete this message'), { statusCode: 403 });
  }

  await Message.update(
    { deleted_at: new Date().toISOString() },
    { where: { id: messageId } },
  );

  return { scope: message.scope, scope_id: message.scope_id };
}

/**
 * Insert a system/activity message into the chat for a given scope.
 * These appear inline with user messages but are styled differently.
 *
 * @param scope     'task' | 'project' | 'firm'
 * @param scopeId   The ID of the task/project/firm
 * @param actorId   The user who performed the action
 * @param body      Human-readable description, e.g. "assigned Jane Doe to this task"
 */
export async function postSystemMessage(
  scope:   string,
  scopeId: string,
  actorId: string,
  body:    string,
): Promise<void> {
  await Message.create({
    scope:     scope as 'firm' | 'project' | 'task',
    scope_id:  scopeId,
    user_id:   actorId,
    body,
    is_system: true,
  });
}
