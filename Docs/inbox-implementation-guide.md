# Inbox — Implementation Guide

Step-by-step build order for the complete inbox system. Each phase is self-contained and testable before moving to the next. No functionality is changed from the shipped version — this is purely the sequence and rationale for building it from scratch.

---

## Phase 0 — Prerequisites (what must exist before inbox)

Before writing a single inbox file, confirm these are already in place:

| Prerequisite | Where |
|---|---|
| JWT auth middleware (`authenticate`) | `backend/src/middleware/auth.ts` |
| `verifyToken()` + `generateToken()` using `JWT_SECRET` | `backend/src/config/auth.ts` |
| `users` table with `first_name`, `name`, `status`, `avatar_url` | DB migration 023, 024 |
| `notifications` table with `scope`, `scope_id`, `actor_id`, `message_id`, `type` columns | DB migration 006b + 010 |
| Sequelize connected via `DATABASE_URL` env var | `backend/src/config/database.ts` |
| `TanStack React Query` provider wrapping the app | `frontend-new/src/App.tsx` |
| `useAuth()` hook + `AuthContext` | `frontend-new/src/context/AuthContext.tsx` |

**Required env vars (beyond the standard set):**

| Var | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (Sequelize) |
| `JWT_SECRET` | Signs and verifies JWTs — SSE auth uses this directly via `verifyToken()` |

---

## Phase 1 — Database Schema

**This project uses Sequelize ORM.** Tables are created and altered automatically by `sequelize.sync({ force: false, alter: { drop: false } })` on every server start — you do not apply raw SQL migrations. Define a model (Phase 2) and the table is created on next `npm run dev`.

The SQL below is the reference schema — it shows the exact shape Sequelize will produce from the models.

### 1.1 `messages` table

```sql
CREATE TABLE messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope      TEXT NOT NULL,                -- 'task' | 'project' | 'firm'
  scope_id   UUID NOT NULL,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_id  UUID REFERENCES messages(id) ON DELETE SET NULL,
  body       TEXT NOT NULL,
  is_system  BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 1.2 `message_reactions` table

Composite PK on all three columns — same user cannot react twice with the same emoji.

```sql
CREATE TABLE message_reactions (
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji      TEXT NOT NULL,
  PRIMARY KEY (message_id, user_id, emoji)
);
```

### 1.3 `message_reads` table

Note: tableName is `message_reads` (plural). Timestamp column is `read_at`, NOT `created_at`.

```sql
CREATE TABLE message_reads (
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  read_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (message_id, user_id)
);
```

### 1.4 `message_scope_participants` table

Timestamp column is `joined_at`, NOT `created_at`.

```sql
CREATE TABLE message_scope_participants (
  scope     TEXT NOT NULL,
  scope_id  UUID NOT NULL,
  user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (scope, scope_id, user_id)
);
```

### 1.5 `notifications` table — required columns

```sql
-- These columns must exist (added by earlier migrations 006b + 010):
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS scope      TEXT NOT NULL DEFAULT 'task';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS scope_id   UUID NULL;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS actor_id   UUID NULL REFERENCES users(id);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS message_id UUID NULL REFERENCES messages(id);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS title      TEXT NULL;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS type       TEXT NOT NULL DEFAULT 'general';
```

---

## Phase 2 — Backend: Sequelize Models

Create one model file per table. Each model maps 1:1 to its table.

**Critical rules matching the actual codebase:**
- Always `timestamps: false` — every model manages its own timestamp columns explicitly (no Sequelize auto-timestamps).
- Always use `DataTypes.TEXT` for string fields (not `STRING`) — consistent with the project.
- Use `MessageAttributes` + `MessageCreationAttributes` pattern with `Optional<>` for all models.

### 2.1 `Message` model

```ts
// backend/src/models/Message.ts
import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface MessageAttributes {
  id: string; scope: 'firm' | 'project' | 'task'; scope_id: string;
  user_id: string; parent_id: string | null; body: string;
  is_system: boolean; deleted_at: string | null;
  created_at: string; updated_at: string;
}
interface MessageCreationAttributes extends Optional<MessageAttributes,
  'id' | 'parent_id' | 'is_system' | 'deleted_at' | 'created_at' | 'updated_at'> {}

class Message extends Model<MessageAttributes, MessageCreationAttributes>
  implements MessageAttributes {
  declare id: string; declare scope: 'firm' | 'project' | 'task';
  declare scope_id: string; declare user_id: string;
  declare parent_id: string | null; declare body: string;
  declare is_system: boolean; declare deleted_at: string | null;
  declare created_at: string; declare updated_at: string;
}

Message.init({
  id:         { type: DataTypes.UUID,    primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  scope:      { type: DataTypes.TEXT,    allowNull: false },
  scope_id:   { type: DataTypes.UUID,    allowNull: false },
  user_id:    { type: DataTypes.UUID,    allowNull: false },
  parent_id:  { type: DataTypes.UUID,    allowNull: true },
  body:       { type: DataTypes.TEXT,    allowNull: false },
  is_system:  { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  deleted_at: { type: DataTypes.DATE,    allowNull: true },
  created_at: { type: DataTypes.DATE,    allowNull: false, defaultValue: DataTypes.NOW },
  updated_at: { type: DataTypes.DATE,    allowNull: false, defaultValue: DataTypes.NOW },
}, { sequelize, tableName: 'messages', timestamps: false });  // ← timestamps: false always

export default Message;
```

### 2.2 `MessageReaction` model

All three columns are PK — no `Optional` needed.

```ts
MessageReaction.init({
  message_id: { type: DataTypes.UUID, allowNull: false, primaryKey: true },
  user_id:    { type: DataTypes.UUID, allowNull: false, primaryKey: true },
  emoji:      { type: DataTypes.TEXT, allowNull: false, primaryKey: true },
}, { sequelize, tableName: 'message_reactions', timestamps: false });
```

### 2.3 `MessageRead` model

Tablename is `message_reads` (plural). Timestamp column is `read_at`.

```ts
MessageRead.init({
  message_id: { type: DataTypes.UUID, allowNull: false, primaryKey: true },
  user_id:    { type: DataTypes.UUID, allowNull: false, primaryKey: true },
  read_at:    { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, { sequelize, tableName: 'message_reads', timestamps: false });
```

### 2.4 `MessageScopeParticipant` model

Timestamp column is `joined_at`.

```ts
MessageScopeParticipant.init({
  scope:     { type: DataTypes.TEXT, allowNull: false, primaryKey: true },
  scope_id:  { type: DataTypes.UUID, allowNull: false, primaryKey: true },
  user_id:   { type: DataTypes.UUID, allowNull: false, primaryKey: true },
  joined_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, { sequelize, tableName: 'message_scope_participants', timestamps: false });
```

### 2.5 Register associations in `models/index.ts`

```ts
// Message author join — used by getMessages and createMessage
Message.belongsTo(User, { foreignKey: 'user_id', as: 'author' });
User.hasMany(Message,   { foreignKey: 'user_id', as: 'messages' });

// Reaction joins
MessageReaction.belongsTo(Message, { foreignKey: 'message_id', as: 'message' });
Message.hasMany(MessageReaction,   { foreignKey: 'message_id', as: 'reactions' });
MessageReaction.belongsTo(User,    { foreignKey: 'user_id', as: 'reactor' });

// Read receipt joins
MessageRead.belongsTo(Message, { foreignKey: 'message_id', as: 'message' });
Message.hasMany(MessageRead,   { foreignKey: 'message_id', as: 'reads' });
MessageRead.belongsTo(User,    { foreignKey: 'user_id', as: 'reader' });
```

> **Note:** `Notification.belongsTo(User, { foreignKey: 'actor_id', as: 'actor' })` is defined
> **inside** `Notification.ts` itself, not in `models/index.ts`. Both patterns work — just be consistent.

---

## Phase 3 — Backend: Notifications Module

### 3.1 Service (`notifications.service.ts`)

Implement these four functions in order:

```
findNotificationsByUser(userId)
  → SELECT * FROM notifications WHERE user_id = userId
     JOIN users AS actor ON actor_id
     ORDER BY created_at DESC LIMIT 30

countUnreadByUser(userId)
  → SELECT COUNT(*) FROM notifications WHERE user_id = userId AND read = false

markNotificationRead(notificationId, userId)
  → UPDATE notifications SET read = true WHERE id = notificationId AND user_id = userId

markAllNotificationsRead(userId)
  → UPDATE notifications SET read = true WHERE user_id = userId AND read = false
```

### 3.2 Controller (`notifications.controller.ts`)

Four thin handlers — each calls service, returns JSON:

```
GET  /                 → listNotifications   → findNotificationsByUser(req.user.id)
GET  /unread-count     → getUnreadCount      → countUnreadByUser(req.user.id)
PATCH /:id/read        → markRead            → markNotificationRead(id, req.user.id)
PATCH /read-all        → markAllRead         → markAllNotificationsRead(req.user.id)
```

**Order matters:** mount `PATCH /read-all` BEFORE `PATCH /:id/read` in the router, otherwise Express matches `read-all` as an `:id` param.

### 3.3 Route (`notifications.routes.ts`)

```ts
router.get('/',             authenticate, requireMember, listNotifications);
router.get('/unread-count', authenticate, requireMember, getUnreadCount);
router.patch('/read-all',   authenticate, requireMember, markAllRead);       // before /:id
router.patch('/:id/read',   authenticate, requireMember, markRead);
```

---

## Phase 4 — Backend: Messages Module

This is the core of the inbox. Build in this order.

### 4.1 Service — read path first

```ts
// messages.service.ts

// Step 1 — build a reaction map (batch, not per-message queries)
async function buildReactionMap(messageIds: string[])
  → SELECT message_id, user_id, emoji FROM message_reactions WHERE message_id IN (...)
  → group into: { [messageId]: { emoji: string, count: number, users: string[] }[] }

// Step 2 — build a read map
async function buildReadMap(messageIds: string[])
  → SELECT message_id, user_id FROM message_reads WHERE message_id IN (...)
  → group into: { [messageId]: string[] }

// Step 3 — getMessages (the main list endpoint)
export async function getMessages(scope, scopeId): Promise<EnrichedMessage[]>
  → SELECT messages + JOIN users AS author WHERE scope=scope AND scope_id=scopeId AND deleted_at IS NULL ORDER BY created_at ASC
  → batch-fetch reactionMap + readMap in parallel (Promise.all)
  → map to EnrichedMessage[] with author + reactions + read_by fields
```

### 4.2 Service — write path

```ts
// Step 4 — createMessage
export async function createMessage(userId, dto): Promise<EnrichedMessage>
  → INSERT INTO messages (scope, scope_id, user_id, body, parent_id, is_system)
  → re-fetch with author join (keeps response shape consistent)
  → fireParticipantNotifications(userId, enrichedMessage).catch(logError)  ← non-blocking
  → return enrichedMessage
```

### 4.3 Service — `fireParticipantNotifications` (critical piece)

This function is fire-and-forget. Build it last within the service so all helpers exist.

```
fireParticipantNotifications(senderId, message):

  if message.is_system → return early (system msgs never notify)

  --- Step 1: Extract @mentions ---
  mentionMatches = body.matchAll(/@(\w+)/g)
  if mentionMatches.length > 0:
    activeUsers = SELECT id, first_name, name FROM users WHERE status = 'Active'
    mentionedUserIds = activeUsers
      .filter(u => mentionMatches includes u.first_name (case-insensitive))
      .map(u => u.id)
      .filter(id => id !== senderId)
      .dedupe()

  --- Step 2: Resolve reply target ---
  if parent_id:
    parent = SELECT user_id FROM messages WHERE id = parent_id
    replyTargetUserId = (parent.user_id !== senderId) ? parent.user_id : null

  --- Step 3: Upsert participants ---
  INSERT INTO message_scope_participants (scope, scope_id, user_id)
  VALUES (sender, ...mentioned, replyTarget)
  ON CONFLICT DO NOTHING

  --- Step 4: Build toNotify (ONLY mentioned + reply target — NO thread_reply) ---
  toNotify = [...mentionedUserIds, replyTargetUserId].dedupe()
  if toNotify.length === 0 → return   ← plain messages create zero notifications

  --- Step 5: Resolve context label ---
  scope = 'task'    → task.title + firm.name
  scope = 'project' → project.name + firm.name
  scope = 'firm'    → firm.name

  --- Step 6: INSERT notifications ---
  for each recipientId in toNotify:
    type = (recipientId in mentionedSet) ? 'mention' : 'reply'
    INSERT { user_id, actor_id, message_id, title, message, type, scope, scope_id }
```

### 4.4 Service — reactions + delete

```ts
addReaction(messageId, userId, emoji)
  → INSERT INTO message_reactions ON CONFLICT DO NOTHING
  → return getReactionsForMessage(messageId)

removeReaction(messageId, userId, emoji)
  → DELETE FROM message_reactions WHERE message_id=... AND user_id=... AND emoji=...
  → return getReactionsForMessage(messageId)

deleteMessage(messageId, userId, isAdmin)
  → fetch message, check ownership, UPDATE deleted_at = NOW()
```

### 4.5 Validation (`messages.validation.ts`)

express-validator chains — always applied as middleware before the controller.

```ts
// GET /messages — scope and scope_id are query params
export const getMessagesValidation = [
  query('scope').isIn(['firm', 'project', 'task']),
  query('scope_id').isUUID('loose'),
];

// POST /messages — body, scope, scope_id required; parent_id + is_system optional
export const createMessageValidation = [
  body('scope').isIn(['firm', 'project', 'task']),
  body('scope_id').isUUID('loose'),
  body('body').trim().notEmpty().isLength({ max: 10000 }),
  body('parent_id').optional({ nullable: true }).isUUID('loose'),
  body('is_system').optional({ nullable: true }).isBoolean(),
];

// POST /:id/reactions and DELETE /:id/reactions
export const addReactionValidation = [
  param('id').isUUID('loose'),
  body('emoji').trim().notEmpty().isLength({ max: 8 }),
];
export const removeReactionValidation = addReactionValidation; // same shape
```

### 4.6 Controller (`messages.controller.ts`)

After `createMessage` resolves, broadcast the new message over SSE before returning:

```ts
// POST /messages
const message = await messagesService.createMessage(req.user.id, req.body);
res.status(201).json({ data: message });
broadcast(message.scope, message.scope_id, { type: 'new_message', payload: message });
```

For reactions, fetch the message's scope first (fire-and-forget helper):

```ts
async function broadcastReaction(messageId: string, reactions: unknown) {
  const msg = await Message.findByPk(messageId, { attributes: ['scope', 'scope_id'], raw: true });
  if (msg) broadcast(msg.scope, msg.scope_id, { type: 'reaction_updated', message_id: messageId, reactions });
}
```

For `markRead`, broadcast after the DB write:

```ts
const newlyRead = await messagesService.markRead(scope, scope_id, req.user.id);
res.json({ marked: newlyRead.length });
if (newlyRead.length > 0) {
  broadcast(scope, scope_id, { type: 'messages_read', reader_id: req.user.id, message_ids: newlyRead });
}
```

### 4.7 Routes (`messages.routes.ts`)

The `/stream` route is registered **before** `router.use(authenticate)` because EventSource cannot send an `Authorization` header — it handles its own token verification from the query param.

```ts
// SSE route — no authenticate middleware — handles own auth
router.get('/stream', streamMessages);

// All other routes go through the standard middleware chain
router.use(authenticate);
router.get('/',                requireMember, getMessagesValidation,    listMessages);
router.post('/',               requireMember, createMessageValidation,  createMessage);
router.post('/read',           requireMember,                           markRead);
router.post('/typing',         requireMember,                           sendTyping);
router.post('/:id/reactions',  requireMember, addReactionValidation,    addReaction);
router.delete('/:id/reactions',requireMember, removeReactionValidation, removeReaction);
router.delete('/:id',          requireMember,                           deleteMessage);
```

---

## Phase 5 — Backend: SSE (`sse.ts`)

Lives at `backend/src/modules/messages/sse.ts`. Imported by the controller.

### 5.1 Channel registry + `subscribe` + `broadcast`

```ts
// sse.ts
import { Response } from 'express';

type Channel = Set<Response>;
const registry = new Map<string, Channel>();

export function channelKey(scope: string, scopeId: string): string {
  return `${scope}:${scopeId}`;
}

// Returns an unsubscribe function — call it on req 'close' event
export function subscribe(scope: string, scopeId: string, res: Response): () => void {
  const key = channelKey(scope, scopeId);
  if (!registry.has(key)) registry.set(key, new Set());
  registry.get(key)!.add(res);

  return () => {
    const ch = registry.get(key);
    if (ch) {
      ch.delete(res);
      if (ch.size === 0) registry.delete(key);
    }
  };
}

export function broadcast(scope: string, scopeId: string, payload: unknown): void {
  const ch = registry.get(channelKey(scope, scopeId));
  if (!ch || ch.size === 0) return;

  const data = `data: ${JSON.stringify(payload)}\n\n`;
  for (const res of ch) {
    try {
      res.write(data);
      (res as unknown as { flush?: () => void }).flush?.(); // flush compression buffers
    } catch {
      ch.delete(res); // silently remove disconnected client
    }
  }
}
```

### 5.2 Typing indicator with auto-expire timer

```ts
// Per-user timers: key = "scope:scopeId:userId"
const typingTimers = new Map<string, ReturnType<typeof setTimeout>>();

export function broadcastTypingStart(
  scope: string, scopeId: string,
  user: { id: string; name: string; avatar_url: string | null }
): void {
  const timerKey = `${channelKey(scope, scopeId)}:${user.id}`;

  // Reset timer on each heartbeat from the client
  const existing = typingTimers.get(timerKey);
  if (existing) clearTimeout(existing);

  broadcast(scope, scopeId, { type: 'typing_start', user });

  // Auto-fire typing_stop after 4s of silence — no client cleanup required
  const timer = setTimeout(() => {
    typingTimers.delete(timerKey);
    broadcast(scope, scopeId, { type: 'typing_stop', user_id: user.id });
  }, 4_000);

  typingTimers.set(timerKey, timer);
}
```

### 5.3 SSE handler in controller

Token is verified via `verifyToken(token)` from `config/auth` (uses `JWT_SECRET`). Heartbeat is **30 seconds**. An extra `X-Accel-Buffering: no` header disables Nginx output buffering. An initial `{ type: 'connected' }` event is sent immediately so the client knows the stream is live.

```ts
export async function streamMessages(req, res) {
  const { scope, scope_id, token } = req.query;

  // Verify JWT from query param (EventSource can't send Authorization header)
  if (!token) return res.status(401).json({ error: 'Missing token' });
  let userId: string;
  try {
    const payload = verifyToken(token);  // from config/auth — uses JWT_SECRET
    userId = payload.sub;
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
  const profile = await User.findByPk(userId, { raw: true });
  if (!profile) return res.status(401).json({ error: 'User not found' });

  if (!scope || !scope_id) return res.status(400).json({ error: 'scope and scope_id are required' });

  // SSE headers — X-Accel-Buffering: no disables Nginx proxy buffering
  res.setHeader('Content-Type',       'text/event-stream');
  res.setHeader('Cache-Control',      'no-cache, no-transform');
  res.setHeader('Connection',         'keep-alive');
  res.setHeader('X-Accel-Buffering',  'no');
  res.flushHeaders();

  const send = (data: string) => { res.write(data); (res as any).flush?.(); };

  // Signal stream is live
  send(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);

  const unsubscribe = subscribe(scope, scope_id, res);

  // Heartbeat every 30 seconds (not 15 — keeps proxies happy without noise)
  const heartbeat = setInterval(() => send(': heartbeat\n\n'), 30_000);

  req.on('close', () => { clearInterval(heartbeat); unsubscribe(); });
}
```

---

## Phase 6 — Frontend: API Client

Add to `frontend-new/src/lib/api.ts`. Three blocks in order:

### 6.1 Types

```ts
export interface AppNotification {
  id: string; user_id: string; ticket_id: string | null;
  scope: string; scope_id: string | null;
  actor_id: string | null; message_id: string | null;
  type: string; title: string; message: string;
  read: boolean; created_at: string;
  actor: { id: string; name: string; avatar_url: string | null } | null;
}

export interface MessageReaction { emoji: string; count: number; users: string[]; }
export interface MessageAuthor   { id: string; name: string; avatar_url: string | null; }

export interface Message {
  id: string; scope: string; scope_id: string; user_id: string;
  parent_id: string | null; body: string; is_system?: boolean;
  created_at: string; updated_at: string;
  author: MessageAuthor; reactions: MessageReaction[]; read_by: string[];
}
```

### 6.2 `notificationsApi`

```ts
export const notificationsApi = {
  list:        () => request<{data: AppNotification[]}>('GET', '/notifications').then(r => r.data),
  markRead:    (id: string) => request<void>('PATCH', `/notifications/${id}/read`),
  markAllRead: () => request<void>('PATCH', '/notifications/read-all'),
  unreadCount: () => request<{data:{count:number}}>('GET', '/notifications/unread-count').then(r => r.data.count),
};
```

### 6.3 `messagesApi`

```ts
export const messagesApi = {
  list:           (scope, scopeId) => request<{data:Message[]}>('GET', `/messages?scope=${scope}&scope_id=${scopeId}`).then(r => r.data),
  create:         (payload)        => request<{data:Message}>('POST', '/messages', payload).then(r => r.data),
  markRead:       (scope, scopeId) => request<{marked:number}>('POST', '/messages/read', { scope, scope_id: scopeId }),
  addReaction:    (messageId, emoji) => request<{data:MessageReaction[]}>('POST', `/messages/${messageId}/reactions`, { emoji }).then(r => r.data),
  removeReaction: (messageId, emoji) => request<{data:MessageReaction[]}>('DELETE', `/messages/${messageId}/reactions`, { emoji }).then(r => r.data),
  delete:         (messageId)      => request<void>('DELETE', `/messages/${messageId}`),
  sendTyping:     (scope, scopeId) => request<void>('POST', '/messages/typing', { scope, scope_id: scopeId }),
};
```

---

## Phase 7 — Frontend: Hooks

Build hooks in dependency order.

### 7.1 `useNotifications` (simplest — build first)

```ts
// hooks/useNotifications.ts
export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn:  notificationsApi.list,
    refetchInterval: 10_000,
    staleTime: 0,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: notificationsApi.markAllRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}
```

### 7.2 `useMessages` + mutations

```ts
// hooks/useMessages.ts
export function useMessages(scope: string, scopeId: string) {
  return useQuery({
    queryKey: queryKeys.messages.byScope(scope, scopeId),
    queryFn:  () => messagesApi.list(scope, scopeId),
    enabled:  !!scope && !!scopeId,
    // No refetchInterval — real-time comes from useMessageStream
  });
}

export function useSendMessage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: (payload) => messagesApi.create(payload),
    onMutate: async ({ scope, scope_id, body, parent_id }) => {
      await qc.cancelQueries({ queryKey: queryKeys.messages.byScope(scope, scope_id) });
      const previous = qc.getQueryData(queryKeys.messages.byScope(scope, scope_id));
      const optimistic: Message = {
        id: `optimistic-${Date.now()}`, scope, scope_id,
        user_id: user?.id ?? '', parent_id: parent_id ?? null,
        body, is_system: false,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        author: { id: user?.id ?? '', name: user?.name ?? '', avatar_url: null },
        reactions: [], read_by: [],
      };
      qc.setQueryData(queryKeys.messages.byScope(scope, scope_id), (old = []) => [...old, optimistic]);
      return { previous, tempId: optimistic.id, scope, scope_id };
    },
    onSuccess: (newMsg, { scope, scope_id }, ctx) => {
      qc.setQueryData(queryKeys.messages.byScope(scope, scope_id),
        (old = []) => old.filter(m => m.id !== ctx?.tempId && m.id !== newMsg.id).concat(newMsg)
      );
    },
    onError: (_err, { scope, scope_id }, ctx) => {
      if (ctx?.previous) qc.setQueryData(queryKeys.messages.byScope(scope, scope_id), ctx.previous);
    },
  });
}

export function useAddReaction() { /* patch reactions in cache onSuccess */ }
export function useRemoveReaction() { /* patch reactions in cache onSuccess */ }
```

### 7.3 `useMessageStream` (SSE hook)

```ts
// hooks/useMessageStream.ts
export function useMessageStream(scope: string, scopeId: string, currentUserId?: string) {
  const qc = useQueryClient();
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);

  useEffect(() => {
    if (!scope || !scopeId) return;
    const token = localStorage.getItem('mw_token');
    if (!token) return;

    const url = `${API_URL}/messages/stream?scope=${scope}&scope_id=${scopeId}&token=${token}`;
    const es = new EventSource(url);

    es.onmessage = (event) => {
      const parsed = JSON.parse(event.data);
      const key = queryKeys.messages.byScope(scope, scopeId);

      switch (parsed.type) {
        case 'new_message':
          qc.setQueryData(key, (old = []) =>
            old.some(m => m.id === parsed.payload.id) ? old : [...old, parsed.payload]);
          break;
        case 'message_deleted':
          qc.setQueryData(key, (old = []) => old.filter(m => m.id !== parsed.message_id));
          break;
        case 'messages_read':
          qc.setQueryData(key, (old = []) => old.map(m =>
            new Set(parsed.message_ids).has(m.id) && !m.read_by.includes(parsed.reader_id)
              ? { ...m, read_by: [...m.read_by, parsed.reader_id] } : m));
          break;
        case 'reaction_updated':
          qc.setQueryData(key, (old = []) => old.map(m =>
            m.id === parsed.message_id ? { ...m, reactions: parsed.reactions } : m));
          break;
        case 'typing_start':
          if (parsed.user.id !== currentUserId)
            setTypingUsers(prev => prev.some(p => p.id === parsed.user.id) ? prev : [...prev, parsed.user]);
          break;
        case 'typing_stop':
          setTypingUsers(prev => prev.filter(p => p.id !== parsed.user_id));
          break;
      }
    };

    es.onerror = () => { /* EventSource auto-reconnects */ };

    return () => { es.close(); setTypingUsers([]); };
  }, [scope, scopeId, currentUserId, qc]);

  return { typingUsers };
}
```

---

## Phase 8 — Frontend: InboxPage Components

Build inner-to-outer. Each component is independently testable.

### Build order

```
1. Helper functions          (pure, no hooks)
2. Small SVG icons           (FirmIcon, ProjectIcon, TaskIcon, FileIcon, CheckIcon)
3. StatusCircle              (read/unread/cleared indicator)
4. ActivityItem              (transition + revision log display)
5. MessageItem               (message card with reactions)
6. InlineReplyComposer       (reply textarea + emoji + @mention)
7. InboxRow                  (left list item)
8. FilterPanel               (slide-over filter drawer)
9. ThreadPanel               (right panel — assembles MessageItem + ActivityItem + InlineReplyComposer)
10. InboxPage                (root — assembles InboxRow + ThreadPanel + FilterPanel)
```

### Step 1 — Helper functions

```ts
// All pure functions, zero imports from React
getDateBucket(iso: string): 'Today' | 'Yesterday' | 'Last 7 Days' | string
groupNotifications(items: AppNotification[]): { label: string; items: AppNotification[] }[]
highlightMentions(text: string): React.ReactNode   // wraps @word in purple <span>
formatDateShort(iso: string): string               // "May 15"
formatMessageTime(iso: string): string             // "Today at 2:30 pm"
applyFilters(items, filters): AppNotification[]    // client-side filter logic
```

### Step 2 — SVG icons

Five small stateless components: `FirmIcon`, `ProjectIcon`, `TaskIcon`, `FileIcon`, `CheckIcon`. Inline SVG, accept `className` prop.

### Step 3 — `StatusCircle`

```ts
function StatusCircle({ read, cleared }: { read: boolean; cleared?: boolean }) {
  // cleared → green circle + white checkmark
  // !read   → blue circle + white checkmark
  // read    → empty grey ring
}
```

### Step 4 — `ActivityItem`

```ts
function ActivityItem({ log }: { log: ActivityLog }) {
  // Renders transition / revision log as a one-line activity entry
  // log_type = 'revision' → "ActorName sent to ⬤ Revisions"
  // log_type = 'transition' → "ActorName changed status: ⬤ StatusName"
  // extractToStatus(comment) parses "→ status_name" from comment string
}
```

### Step 5 — `MessageItem`

```ts
interface MessageItemProps {
  msg:            Message;
  notificationId: string;
  scope:          string;
  scopeId:        string;
  userId:         string;    // current user ID — needed for reaction highlight
  onMarkRead:     (id: string) => void;
  onReply:        (msg: Message) => void;
}

function MessageItem({ msg, notificationId, scope, scopeId, userId, onMarkRead, onReply }) {
  const addReaction    = useAddReaction();
  const removeReaction = useRemoveReaction();

  function toggleReaction(emoji: string) {
    const existing  = msg.reactions.find(r => r.emoji === emoji);
    const hasReacted = existing?.users.includes(userId) ?? false;
    if (hasReacted) removeReaction.mutate({ messageId: msg.id, emoji, scope, scopeId });
    else            addReaction.mutate({ messageId: msg.id, emoji, scope, scopeId });
  }

  // Layout: avatar + name + time → body → divider → reactions row + Clear + Reply
  // 👍 and 😊 are hardcoded quick-reaction buttons
  // Both check hasReacted from msg.reactions[].users[] and apply purple highlight
}
```

### Step 6 — `InlineReplyComposer`

This is the most complex component. Build in this order:

```
A. Basic state: draft, showEmoji, mentionQuery, mentionIdx, textareaRef, emojiRef

B. Mount effect (runs once):
   NOTE: call useAuth() inside the component — never pass userId as a prop.
         A prop may be undefined on first render, making the author-id check unreliable.

   Three cases in order:

   1. Replying to someone else's message (parentMsg.author.id !== myId)
      → firstName = parentMsg.author.first_name ?? parentMsg.author.name.split(' ')[0]
      → setDraft(`@${firstName} `)

   2. Replying to own message that contains an @mention
      → match = parentMsg.body.match(/@(\w+)/)
      → if match: setDraft(`@${match[1]} `)
      WHY: if the current user sent "@abhishek hi bro" and clicks Reply on it,
           the conversation partner is still Abhishek. Extract the tag from the
           body so context carries over without the user re-typing it manually.

   3. Replying to own message with no @mention
      → leave draft empty

   - requestAnimationFrame → focus textarea, cursor at end

C. onChange handler:
   - update draft
   - auto-grow textarea: ta.style.height = `${Math.min(ta.scrollHeight, 112)}px`
   - detect /@(\w*)$/ at cursor → setMentionQuery / null

D. @mention filter:
   mentionMatches = mentionUsers
     .filter(u => firstName.startsWith(query) && u.id !== myId)
     .slice(0, 6)

E. selectMention(user):
   - find /@\w*$/ before cursor in draft
   - replace with @firstName + space
   - re-focus, move cursor past inserted text

F. Emoji picker:
   - useEffect: if showEmoji → add mousedown listener on document
   - onMouseDown + e.preventDefault() on each emoji button (prevents textarea blur)
   - insertEmoji: splice emoji at cursor position, re-focus

G. handleKeyDown:
   - mention open: ArrowDown/Up → mentionIdx, Tab/Enter → selectMention, Escape → close mention
   - no mention open: Escape → onClose
   - Enter (no Shift) → send

H. Send: trim draft, call onSend(draft), parent closes via setActiveReplyId(null)
```

### Step 7 — `InboxRow`

```ts
function InboxRow({ item, isSelected, onSelect, onMarkRead }) {
  // Click anywhere → onSelect(item)
  // Hover → show Mail icon + "Clear" button (group-hover pattern)
  // isSelected → bg-[#F9F5FF] background
  // StatusCircle + scope icon + actor avatar + title/date/preview
}
```

### Step 8 — `FilterPanel`

```ts
function FilterPanel({ open, onClose, firmNames, notifications, activeFilters, onApply }) {
  const [local, setLocal] = useState(activeFilters);  // initialise from props on mount
  // Do NOT sync local from activeFilters in a useEffect — causes lint warning and
  // is unnecessary since the panel re-mounts (SlideOver unmounts on close)

  // 6 boolean checkboxes: mentions, replies, unread, assignedToMe, overdue, cleared
  // Counts computed from full notifications array (not filtered subset)
  // Clients section: searchable firm list, show 8, "Show N more" toggle
  // "Clear Filter" → setLocal(DEFAULT_FILTERS)
  // "Apply" → onApply(local), onClose()
}
```

### Step 9 — `ThreadPanel`

```ts
function ThreadPanel({ notification, onClose, onMarkRead }) {
  const { user } = useAuth();
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);

  // 1. Derive scope + scopeId from notification
  const scope   = notification.scope   ?? 'task';
  const scopeId = notification.scope_id ?? notification.ticket_id ?? '';

  // 2. Data fetches (in parallel)
  useMessages(scope, scopeId);          // messages into cache
  useMessageStream(scope, scopeId);     // SSE keeps cache live
  useSendMessage();                     // for InlineReplyComposer
  useMentionableUsers();                // for InlineReplyComposer
  useTask(taskId);                      // breadcrumb
  useProjects(task?.firm_id);           // breadcrumb
  useQuery(timeLogsApi.list(scopeId));  // activity logs

  // 3. Build feed
  const mentionedMessages = messages.filter(m => /@\w+/.test(m.body));
  const activityLogs = timeLogs.filter(l => l.log_type === 'transition' || l.log_type === 'revision');
  const feed = [...mentionedMessages, ...activityLogs].sort(by created_at ASC);

  // 4. Auto-scroll
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [feed.length]);

  // 5. Render header + feed + InlineReplyComposer toggle
}
```

### Step 10 — `InboxPage`

```ts
export default function InboxPage() {
  // State
  const [selectedNotification, setSelectedNotification] = useState<AppNotification | null>(null);
  const [activeFilters, setActiveFilters]               = useState<ActiveFilters>(DEFAULT_FILTERS);
  const [filterOpen, setFilterOpen]                     = useState(false);

  // Data
  const { data: notifications } = useNotifications();
  const { mutate: markRead }    = useMarkNotificationRead();
  const { mutate: markAllRead } = useMarkAllNotificationsRead();
  const { data: firms }         = useFirms();

  // Derived
  const filtered = applyFilters(notifications ?? [], activeFilters);
  const groups   = groupNotifications(filtered);

  // Layout: two-column flex
  // Left: 480px wide when ThreadPanel open, flex-1 when closed
  // Right: ThreadPanel (only when selectedNotification set)
  // Overlay: FilterPanel (SlideOver)
}
```

---

## Phase 9 — Wiring & Integration Checklist

Run through this list after all phases are complete:

- [ ] `backend/src/routes/index.ts` mounts `messagesRouter` at `/messages`
- [ ] `backend/src/routes/index.ts` mounts `notificationsRouter` at `/notifications`
- [ ] `backend/src/models/index.ts` exports all 4 new models and registers their associations
- [ ] SSE `/stream` route is registered **before** `router.use(authenticate)` in `messages.routes.ts`
- [ ] `notifications/read-all` route is mounted **before** `/:id/read` route (avoids param collision)
- [ ] `backend/.env` has `DATABASE_URL` and `JWT_SECRET` set
- [ ] `frontend-new/src/lib/queryKeys.ts` has `messages.byScope(scope, scopeId)` key
- [ ] `frontend-new/src/App.tsx` has `<Route path="/inbox" element={<ProtectedRoute><InboxPage /></ProtectedRoute>} />`
- [ ] Sidebar has `/inbox` nav link
- [ ] `npm run build` in backend passes with zero TypeScript errors
- [ ] `npx tsc --noEmit` in frontend-new passes with zero TypeScript errors

---

## Phase 10 — Testing Scenarios

Manual test matrix to verify the full system before considering it done:

### Notifications

| Scenario | Expected |
|----------|----------|
| User A sends "hello" (no @tag) | No notification for anyone |
| User A sends "@Alex hello" | Alex gets 1 'mention' notification |
| User A replies to Alex's message (no @tag) | Alex gets 1 'reply' notification |
| User A replies to own message | No notification (self-reply excluded) |
| User A sends "@Alex @Sam check this" | Both Alex and Sam get separate 'mention' notifications |
| User A replies to Alex's message and also @tags Sam | Alex gets 'reply', Sam gets 'mention' |
| Mark all read | All left column circles become empty grey rings |
| Poll interval | New notification from another user appears within 10 seconds |

### Thread Panel

| Scenario | Expected |
|----------|----------|
| Click notification row | ThreadPanel opens, breadcrumb shows task title + firm |
| Plain messages in thread | Do NOT appear in inbox feed (only @tagged ones do) |
| New @message sent while panel open | Appears in feed instantly via SSE |
| Click row again / × close | ThreadPanel closes |

### Reply

| Scenario | Expected |
|----------|----------|
| Click Reply on someone else's message | Composer opens, pre-filled "@TheirFirstName " |
| Click Reply on own message that had "@abhishek …" | Composer opens, pre-filled "@abhishek " |
| Click Reply on own message with no @tag | Composer opens, draft is empty |
| Click Reply again on same message | Composer toggles off |
| Click Reply on different message | Previous composer closes, new one opens |
| Type @name, select from dropdown | Name inserted at cursor, cursor moves past it |
| Press Enter | Message sent, composer closes |
| Press Escape | Composer closes |

### Reactions

| Scenario | Expected |
|----------|----------|
| Click 👍 (not yet reacted) | Button highlights purple, count increments |
| Click 👍 again (already reacted) | Highlight removed, count decrements |
| Another user reacts | Count updates via SSE reaction_updated event |

### SSE

| Scenario | Expected |
|----------|----------|
| Second browser tab sends a message | First tab receives it within ~1s (no refresh) |
| Tab closes / navigates away | SSE connection closes, no leaked EventSource |
| Network drops briefly | EventSource auto-reconnects (browser built-in) |
