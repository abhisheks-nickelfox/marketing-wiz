import { Op } from 'sequelize';
import { Message, MessageReaction, MessageRead, User, Notification, Firm, Project, Ticket } from '../../models';
import type { CreateMessageDto } from './dto/create-message.dto';

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
 * Scan a message body for @mentions, look up users by first_name (case-insensitive),
 * and create a 'mention' notification for each matched user (skipping the sender).
 * Fire-and-forget — caller wraps in .catch(() => {}).
 */
async function fireMentionNotifications(
  senderId:   string,
  senderName: string,
  body:       string,
  scope:      string,
  scopeId:    string,
): Promise<void> {
  const matches = [...body.matchAll(/@(\w+)/g)].map((m) => m[1]);
  if (matches.length === 0) return;

  const [users, { ticketId, contextName }] = await Promise.all([
    User.findAll({
      where: {
        status: 'Active',
        [Op.or]: matches.map((m) => ({ first_name: { [Op.iLike]: m } })),
      },
      attributes: ['id'],
      raw: true,
    }) as unknown as Promise<{ id: string }[]>,
    resolveScope(scope, scopeId),
  ]);

  const targets = users.filter((u) => u.id !== senderId);
  if (targets.length === 0) return;

  await Notification.bulkCreate(
    targets.map((u) => ({
      user_id:   u.id,
      ticket_id: ticketId,
      actor_id:  senderId,
      title:     contextName,
      message:   body,
      type:      'mention',
      read:      false,
      scope,
      scope_id:  scopeId,
    })),
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

  // Non-blocking: parse @mentions and notify tagged users
  fireMentionNotifications(userId, author.name, dto.body.trim(), dto.scope, dto.scope_id).catch(() => {});

  return {
    id:         full!.id,
    scope:      full!.scope,
    scope_id:   full!.scope_id,
    user_id:    full!.user_id,
    parent_id:  full!.parent_id,
    body:       full!.body,
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
