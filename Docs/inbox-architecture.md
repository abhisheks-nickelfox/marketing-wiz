# Inbox Architecture

Full reference for the inbox system in `frontend-new`. Covers data flow, component structure, notification lifecycle, real-time updates, and every interaction path.

---

## Table of Contents

1. [Overview](#overview)
2. [Tech Stack & Dependencies](#tech-stack--dependencies)
3. [File Map](#file-map)
4. [Data Model](#data-model)
5. [Component Tree](#component-tree)
6. [Data Fetching Layer](#data-fetching-layer)
7. [Notification Lifecycle](#notification-lifecycle)
8. [Thread Panel Flow](#thread-panel-flow)
9. [Reply Flow](#reply-flow)
10. [Reaction Flow](#reaction-flow)
11. [Real-Time (SSE)](#real-time-sse)
12. [Filter Panel](#filter-panel)
13. [State Map](#state-map)
14. [Backend Endpoints Used](#backend-endpoints-used)
15. [Design Decisions & Constraints](#design-decisions--constraints)

---

## Overview

The inbox is a two-column notification centre modelled after Slack's mentions/activity feed:

- **Left column** — list of notifications, grouped by date (Today / Yesterday / Last 7 Days / Month).
- **Right column** — thread panel that opens when a notification row is clicked; shows the full @mention-driven message history for that task/project/firm alongside status-change activity logs.

Key rule: **only messages containing at least one `@mention` appear in the inbox thread panel**. Plain chat messages are visible in the task's ChatTab but never surface in the inbox. This is enforced at two levels — the backend only creates notifications for @mentioned users and direct reply targets, and the frontend filters the fetched message list to `/@\w+/.test(m.body)` before rendering.

---

## Tech Stack & Dependencies

| Concern | Library |
|---------|---------|
| Data fetching / caching | TanStack React Query v5 |
| Real-time updates | Browser `EventSource` (SSE) |
| Polling (notification list) | `refetchInterval: 10_000` in `useNotifications` |
| Optimistic UI (send message) | `onMutate` in `useSendMessage` |
| Auth context | `useAuth()` from `context/AuthContext.tsx` |
| Icons | `@untitled-ui/icons-react` |
| Slide-over drawer | `components/ui/SlideOver.tsx` |

---

## File Map

```
frontend-new/src/
├── pages/
│   └── InboxPage.tsx               ← entire inbox UI (single file)
│
├── hooks/
│   ├── useNotifications.ts         ← poll /api/notifications every 10s
│   ├── useMessages.ts              ← fetch + mutate messages + reactions
│   ├── useMessageStream.ts         ← SSE connection for live updates
│   └── useMentionableUsers.ts      ← @mention autocomplete list
│
├── lib/
│   └── api.ts                      ← AppNotification, Message, notificationsApi, messagesApi
│
backend/src/modules/
├── notifications/
│   ├── notifications.service.ts    ← findNotificationsByUser, markRead, notifyUser
│   ├── notifications.controller.ts
│   └── notifications.routes.ts
│
├── messages/
│   ├── messages.service.ts         ← createMessage, fireParticipantNotifications
│   ├── messages.controller.ts
│   └── messages.routes.ts
│
└── models/
    ├── Notification.ts
    ├── Message.ts
    ├── MessageReaction.ts
    ├── MessageRead.ts
    └── MessageScopeParticipant.ts
```

---

## Data Model

### `AppNotification` (frontend type / `notifications` table)

```ts
interface AppNotification {
  id:         string;
  user_id:    string;          // recipient
  ticket_id:  string | null;   // legacy FK — may be null for project/firm scope
  scope:      string;          // 'task' | 'project' | 'firm'
  scope_id:   string | null;   // ID of the task/project/firm
  actor_id:   string | null;   // user who sent the message
  message_id: string | null;   // the message that triggered this notification
  type:       string;          // 'mention' | 'reply'
  title:      string;          // context name (task title, project name, firm name)
  message:    string;          // full message body (used to render preview + highlight @tags)
  read:       boolean;
  created_at: string;
  actor:      { id, name, avatar_url } | null;
}
```

### `Message` (frontend type / `messages` table)

```ts
interface Message {
  id:         string;
  scope:      string;          // 'task' | 'project' | 'firm'
  scope_id:   string;
  user_id:    string;          // sender
  parent_id:  string | null;   // set when this is a reply
  body:       string;
  is_system?: boolean;         // true for auto-generated activity messages
  created_at: string;
  updated_at: string;
  author:     { id, name, avatar_url };
  reactions:  { emoji, count, users: string[] }[];  // users = array of user IDs
  read_by:    string[];        // user IDs who have read this message
}
```

### `TimeLog` (used for activity feed in thread panel)

Only `log_type = 'transition'` and `log_type = 'revision'` entries are used in the inbox. They are rendered as `ActivityItem` entries in the chronological feed.

### `MessageScopeParticipant` (backend only)

Tracks which users have participated in a scope's conversation. Written by `fireParticipantNotifications` but NOT used to determine who gets notified (that would create `thread_reply` spam). Only used for participant roster purposes.

---

## Component Tree

```
InboxPage                              (pages/InboxPage.tsx)
│
│  state: selectedNotification: AppNotification | null
│  state: activeFilters: ActiveFilters
│  state: filterOpen: boolean
│
├── InboxList  (left column)
│   ├── Header
│   │   ├── "Mark all as read" button   → markAllNotificationsRead()
│   │   ├── "Clear all" button          → markAllNotificationsRead()
│   │   └── "Filter" button             → setFilterOpen(true)
│   │
│   └── grouped sections (Today / Yesterday / Last 7 Days / Month)
│       └── InboxRow  × N
│           ├── StatusCircle            (blue = unread, green = cleared)
│           ├── scope icon              (TaskIcon / ProjectIcon / FirmIcon)
│           ├── actor Avatar
│           ├── title + date + message preview
│           └── hover actions: "Mark as read" (mail icon) + "Clear" button
│
├── ThreadPanel  (right column — only when selectedNotification is set)
│   │
│   │  state: activeReplyId: string | null
│   │
│   ├── Header
│   │   ├── scope icon + actor avatar + title
│   │   ├── breadcrumb: [ProjectIcon] [project name] | [firm name]
│   │   ├── "/ Clear all" button        → onMarkRead(notification.id)
│   │   └── × close button             → setSelectedNotification(null)
│   │
│   └── Feed  (chronological: mentionedMessages + activityLogs)
│       ├── ActivityItem               (log_type: transition / revision)
│       └── MessageItem                (messages where /@\w+/.test(body))
│           ├── Avatar + name + timestamp
│           ├── message body           (highlightMentions → purple @tags)
│           ├── 👍 reaction toggle     (count, highlighted if current user reacted)
│           ├── 😊 reaction toggle
│           ├── "Clear" button         → onMarkRead(notification.id)
│           └── "Reply" button         → setActiveReplyId(msg.id) toggle
│
│           InlineReplyComposer        (mounts below card when activeReplyId === msg.id)
│           ├── "Replying to <name>" header
│           ├── × cancel button        → setActiveReplyId(null)
│           ├── @mention dropdown      (useMentionableUsers, self excluded)
│           ├── emoji picker           (12 quick emojis, outside-click to close)
│           ├── textarea               (pre-filled @tag, auto-grows — see Reply Flow)
│           ├── 😊 emoji toggle button
│           └── Send button            → sendMessage.mutate() + close
│
└── FilterPanel  (SlideOver — right drawer)
    ├── "Filter By" checkboxes         (Mentions, Replies, Unread, Assigned to me, Overdue, Cleared)
    ├── per-filter item counts
    ├── "Clients" section              (firm name list, searchable, paginated: 8 + show more)
    ├── "Clear Filter" button
    └── "Apply" button                 → setActiveFilters(local)
```

---

## Data Fetching Layer

### `useNotifications` (polling)

```ts
// hooks/useNotifications.ts
useQuery({
  queryKey: ['notifications'],
  queryFn:  notificationsApi.list,       // GET /api/notifications
  refetchInterval: 10_000,               // poll every 10 seconds
  staleTime: 0,                          // always considered stale
})
```

Returns all notifications for the current user, ordered newest-first, capped at 30.

### `useMessages` + `useMessageStream` (fetch + live)

```ts
// hooks/useMessages.ts
useQuery({
  queryKey: queryKeys.messages.byScope(scope, scopeId),
  queryFn:  () => messagesApi.list(scope, scopeId),  // GET /api/messages?scope=&scope_id=
  enabled:  !!scope && !!scopeId,
  // No refetchInterval — live updates come from SSE
})
```

`useMessageStream` (SSE) keeps the same cache key up-to-date in real time. Both hooks target the same query key so they share one cache entry.

### `useSendMessage` (optimistic)

```ts
onMutate: ({ scope, scope_id, body, parent_id }) => {
  // 1. Cancel in-flight queries for this scope
  // 2. Snapshot current data
  // 3. Append an optimistic message with tempId = `optimistic-${Date.now()}`
  // 4. Return { previous, tempId } for rollback
}
onSuccess: (newMessage, vars, context) => {
  // Replace temp message with real message from server (dedup by id)
}
onError: (_err, vars, context) => {
  // Roll back to previous snapshot
}
```

### `useMentionableUsers`

```ts
useQuery({
  queryKey: queryKeys.users.mentionable,
  queryFn:  mentionableUsersApi.list,
  staleTime: 5 * 60 * 1000,              // 5-minute cache
})
// Post-filtered to status === 'Active' only
```

### Time Logs (activity feed)

Fetched inline inside `ThreadPanel` for `scope === 'task'` only:

```ts
useQuery<TimeLog[]>({
  queryKey: ['timeLogs', scopeId],
  queryFn:  () => timeLogsApi.list(scopeId),
  enabled:  !!scopeId && scope === 'task',
})
// Filtered to log_type IN ('transition', 'revision') before rendering
```

---

## Notification Lifecycle

### 1. Message sent in ChatTab (any scope)

```
User A sends "Hey @Alex can you check this?"
                    ↓
POST /api/messages  { scope, scope_id, body }
                    ↓
backend: createMessage()
  → INSERT into messages table
  → re-fetch with author join
  → call fireParticipantNotifications(senderId, enrichedMessage)   ← non-blocking
```

### 2. `fireParticipantNotifications` logic

```
Step 1 — Extract @mention targets
  body.matchAll(/@(\w+)/g)  → ["Alex"]
  SELECT id, first_name, name FROM users WHERE status = 'Active'
  Match first names case-insensitively
  Exclude senderId
  → mentionedUserIds = ['<alex-uuid>']

Step 2 — Resolve reply target
  if parent_id:
    SELECT user_id FROM messages WHERE id = parent_id
    exclude senderId
  → replyTargetUserId = '<uuid>' or null

Step 3 — Upsert scope participants
  INSERT INTO message_scope_participants (scope, scope_id, user_id)
  for each of: sender + mentioned + reply-target
  ON CONFLICT DO NOTHING

Step 4 — Build recipient list
  toNotify = [...mentionedUserIds, replyTargetUserId].dedupe()
  if toNotify.length === 0 → RETURN (no notification, no spam)

Step 5 — Resolve context label
  scope = 'task'    → task title + firm name
  scope = 'project' → project name + firm name
  scope = 'firm'    → firm name

Step 6 — INSERT notifications
  for each recipientId in toNotify:
    type = mentionedSet.has(recipientId) ? 'mention' : 'reply'
    INSERT { user_id, actor_id, message_id, title, message, type, scope, scope_id }
```

### 3. Notification polling picks it up

```
useNotifications refetchInterval fires every 10s
GET /api/notifications → returns up to 30 notifications DESC
→ TanStack cache updated → InboxRow appears in left list
```

### 4. Notification types

| Type | When created |
|------|-------------|
| `mention` | Recipient's first name was @tagged in the message body |
| `reply` | Message had a `parent_id` pointing to recipient's message |

`thread_reply` (old — notified all thread participants on every message) was **removed**. Plain messages with no @tags and no parent_id create zero notifications.

---

## Thread Panel Flow

```
User clicks InboxRow
  → setSelectedNotification(item)
  → ThreadPanel mounts

ThreadPanel derives:
  scope   = notification.scope   ?? 'task'
  scopeId = notification.scope_id ?? notification.ticket_id ?? ''

Parallel data fetches:
  useMessages(scope, scopeId)        → all messages for this scope
  useMessageStream(scope, scopeId)   → SSE stream opened
  useQuery(timeLogsApi.list(scopeId))→ time logs for activity feed (task scope only)
  useTask(taskId)                    → task title + firm_id + project_id
  useProjects(task.firm_id)          → project list (for breadcrumb)

Feed construction:
  mentionedMessages = messages.filter(m => /@\w+/.test(m.body))
  activityLogs = timeLogs
    .filter(l => l.log_type === 'transition' || l.log_type === 'revision')
    .map(l => ActivityLog shape)
  feed = [...mentionedMessages, ...activityLogs]
    .sort((a, b) => new Date(a.ts) - new Date(b.ts))

Render:
  each FeedItem:
    kind = 'activity' → <ActivityItem log={...} />
    kind = 'message'  → <MessageItem msg={...} />
                         + (activeReplyId === msg.id) → <InlineReplyComposer />

Auto-scroll:
  useEffect([feed.length]) → messagesEndRef.scrollIntoView({ behavior: 'smooth' })
```

### Breadcrumb logic

```
task.parent_task_id present → "Sub-task"
task.project_id + project found → project.name
else → (no left label, show firm name only)

Rendered as: [FileIcon] [left label] | [firm name]
```

---

## Reply Flow

```
User clicks "Reply" on a MessageItem
  → setActiveReplyId(msg.id)
  → if already active for same id: setActiveReplyId(null)  (toggle off)

InlineReplyComposer mounts
  useEffect on mount — three cases:

  Case 1: replying to someone else's message
    parentMsg.author.id !== myId
    → firstName = parentMsg.author.first_name ?? parentMsg.author.name.split(' ')[0]
    → setDraft(`@${firstName} `)

  Case 2: replying to own message that contains an @mention
    parentMsg.author.id === myId && /@(\w+)/.test(parentMsg.body)
    → match = parentMsg.body.match(/@(\w+)/)
    → setDraft(`@${match[1]} `)
    Reason: if Alex sent "@abhishek hi bro" and clicks Reply on his own message,
    the conversation is still with Abhishek — extract the tag from the body.

  Case 3: replying to own message with no @mention
    → leave draft empty
    requestAnimationFrame:
      textarea.focus()
      textarea.setSelectionRange(end, end)

@mention autocomplete:
  onChange detects /@(\w*)$/ at cursor
  setMentionQuery(match[1])
  mentionMatches = mentionUsers
    .filter(u => u.first_name.startsWith(query) && u.id !== myId)
    .slice(0, 6)
  keyboard: ArrowDown/Up → mentionIdx, Tab/Enter → selectMention(), Escape → close

selectMention(user):
  replaces /@\w*$/ before cursor with @firstName + space
  re-focuses, moves cursor past inserted text

Emoji picker:
  FaceHappy button → setShowEmoji(true)
  outside mousedown → setShowEmoji(false)
  click emoji → insert at cursor position
  uses onMouseDown + preventDefault to avoid textarea blur

Send (Enter without Shift, or Send button):
  sendMessage.mutate({
    scope,
    scope_id: scopeId,
    body: draft.trim(),
    parent_id: parentMsg.id,       ← thread link
  })
  setActiveReplyId(null)            ← close composer

Backend on receipt:
  fireParticipantNotifications:
    parent author → 'reply' notification
    any @tagged users → 'mention' notification
```

---

## Reaction Flow

```
User clicks 👍 or 😊 on MessageItem
  → toggleReaction(emoji)

toggleReaction(emoji):
  existing = msg.reactions.find(r => r.emoji === emoji)
  hasReacted = existing?.users.includes(userId) ?? false

  if hasReacted:
    removeReaction.mutate({ messageId: msg.id, emoji, scope, scopeId })
    → DELETE /api/messages/:id/reactions  { emoji }
    onSuccess: patch cache for this scope
      old.map(m => m.id === messageId ? { ...m, reactions } : m)

  else:
    addReaction.mutate({ messageId: msg.id, emoji, scope, scopeId })
    → POST /api/messages/:id/reactions  { emoji }
    onSuccess: same cache patch

Visual state:
  thumbsUp = msg.reactions.find(r => r.emoji === '👍')
  reacted  → bg-[#EDE9FE] border-[#7F56D9] text-[#6941C6]
  count    → shown inline if thumbsUp.count > 0

SSE 'reaction_updated' event:
  updates the same message in cache for all other open clients
```

---

## Real-Time (SSE)

`useMessageStream` opens `EventSource` to:

```
GET /api/messages/stream?scope=<scope>&scope_id=<id>&token=<jwt>
```

Token is passed as a query parameter because `EventSource` does not support custom headers.

### Event types handled

| Event | Payload | Cache action |
|-------|---------|-------------|
| `new_message` | `payload: Message` | Append to cache if not already present (dedup by id) |
| `message_deleted` | `message_id: string` | Filter out from cache |
| `messages_read` | `reader_id, message_ids[]` | Add `reader_id` to `read_by[]` on each message |
| `reaction_updated` | `message_id, reactions[]` | Replace `reactions` on the matching message |
| `typing_start` | `user: { id, name, avatar_url }` | Add to `typingUsers` state (skip own user) |
| `typing_stop` | `user_id: string` | Remove from `typingUsers` state |

Server auto-fires `typing_stop` after 4 seconds of silence so the indicator clears even if the other client disconnects without sending an explicit stop.

### Connection lifecycle

```
ThreadPanel mounts → useMessageStream called → EventSource opened
ThreadPanel unmounts → cleanup: es.close(), setTypingUsers([])
scope or scopeId changes → useEffect re-runs → old connection closed, new one opened
```

### Notifications vs real-time

| Channel | Used for | Mechanism |
|---------|----------|-----------|
| SSE | Message updates inside an open thread panel | EventSource |
| Polling | Notification list (left column badge count) | `refetchInterval: 10_000` |

---

## Filter Panel

Client-side only — no API call on filter change.

### `ActiveFilters` shape

```ts
interface ActiveFilters {
  mentions:     boolean;   // notification.message contains /@\w+/
  replies:      boolean;   // notification.message includes 'reply'
  unread:       boolean;   // !notification.read
  assignedToMe: boolean;   // notification.message includes 'assigned'
  overdue:      boolean;   // notification.message includes 'overdue'
  cleared:      boolean;   // notification.read === true
  clients:      string[];  // firm names (future: needs firm mapping)
}
```

### `applyFilters()` logic

```
if no filter active → return all items (fast path)

for each notification:
  if any boolean filter active:
    return true if ANY active filter matches (OR logic within type group)
    return false if client filter also needs matching (AND between groups)
```

### Counts

Counts shown per filter row are computed from the full unfiltered `allNotifications` array (not the filtered result), so counts don't change as you toggle filters.

---

## State Map

| State | Owner | Purpose |
|-------|-------|---------|
| `selectedNotification` | `InboxPage` | Which notification's thread panel is open |
| `activeFilters` | `InboxPage` | Applied notification filters |
| `filterOpen` | `InboxPage` | Filter slide-over visibility |
| `activeReplyId` | `ThreadPanel` | Which message has its InlineReplyComposer open |
| `draft` | `InlineReplyComposer` | Current reply text |
| `mentionQuery` | `InlineReplyComposer` | @mention query string (null = dropdown closed) |
| `mentionIdx` | `InlineReplyComposer` | Keyboard-selected mention index |
| `showEmoji` | `InlineReplyComposer` | Emoji picker visibility |
| `local` | `FilterPanel` | Uncommitted filter state (applied on "Apply" click) |
| `clientSearch` | `FilterPanel` | Firm name search string |
| `showAll` | `FilterPanel` | Whether to show > 8 firms |

---

## Backend Endpoints Used

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/notifications` | Notification list (polled every 10s) |
| GET | `/api/notifications/unread-count` | Badge count in Sidebar |
| PATCH | `/api/notifications/:id/read` | Mark single notification read |
| PATCH | `/api/notifications/read-all` | Clear all |
| GET | `/api/messages?scope=&scope_id=` | Fetch all messages for a scope |
| POST | `/api/messages` | Send a message (with optional `parent_id`) |
| GET | `/api/messages/stream?scope=&scope_id=&token=` | SSE stream |
| POST | `/api/messages/:id/reactions` | Add reaction |
| DELETE | `/api/messages/:id/reactions` | Remove reaction |
| GET | `/api/tasks/:id/time-logs` | Activity feed (transition + revision logs) |
| GET | `/api/tasks/:id` | Task context for breadcrumb |
| GET | `/api/projects?firm_id=` | Project name for breadcrumb |
| GET | `/api/users/mentionable` | @mention autocomplete list |

---

## Design Decisions & Constraints

### Inbox is notification-driven, not message-driven

The left column shows `notifications` rows, not raw messages. A notification is only created when a user is explicitly @mentioned or is the direct reply target. This means:

- A team member sees only conversations that are relevant to them.
- Browsing a task's ChatTab freely doesn't pollute anyone's inbox.

### Thread panel is mention-filtered

Even though `useMessages` fetches all messages for a scope (ChatTab and inbox share the same query cache), the inbox thread panel applies `/@\w+/.test(m.body)` before rendering. This ensures plain "ok", "done", "noted" replies don't clutter the inbox view — only the @tagged messages and their context appear.

### No `thread_reply` notification type

Older pattern was: every message in a thread notified all participants (`thread_reply`). This was removed because it caused untagged "reply" messages to flood everyone's inbox. The current system: zero notifications unless you are explicitly @mentioned or someone replied directly to your message.

### Auto-tag logic in InlineReplyComposer

`useAuth()` is called directly inside `InlineReplyComposer` (not passed as a prop) to ensure `myId` is always the current user ID on the first render. Passing it as a prop causes an `undefined` value on mount, which makes the self-check unreliable.

The pre-fill has three cases, applied in order:

| Condition | Pre-fill |
|---|---|
| `parentMsg.author.id !== myId` | `@TheirFirstName ` — tags the message author |
| `parentMsg.author.id === myId` AND body contains `@mention` | `@mention ` — extracts first `@(\w+)` from the parent body |
| `parentMsg.author.id === myId` AND body has no `@mention` | Empty |

**Why case 2 matters:** If Alex sent `"@abhishek hi bro"` and then clicks Reply on his own message, the conversation partner is still Abhishek. Without this rule the composer opens blank and the user has to manually type `@abhishek` again. With it, the context carries over automatically regardless of which side of the conversation you reply from.

### `onMouseDown + preventDefault` for emoji picker

Emoji buttons use `onMouseDown` instead of `onClick` and call `e.preventDefault()`. This prevents the textarea from losing focus before the emoji is inserted, which would cause cursor position to jump to the start.

### Optimistic send

Messages appear immediately in the thread panel on send (via `onMutate`). If the server request fails, the optimistic message is rolled back. The temp ID pattern (`optimistic-${Date.now()}`) prevents duplicate rendering when the real message arrives via SSE or `onSuccess`.

### Notification read state is local-only optimistic

When "Clear" is clicked on a notification, `markRead(id)` is called and `selectedNotification` is mutated locally (`{ ...prev, read: true }`). The left column badge color updates immediately without waiting for a re-fetch.

### SSE token as query param

`EventSource` does not support custom headers in the browser. The JWT is passed as a `?token=` query parameter. The backend validates it on stream open. This is a standard SSE constraint — it is not a security regression because the token is already stored in `localStorage`.
