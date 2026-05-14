# Notification System — Full Specification

## Current State (already implemented)

| Trigger | Type | Recipients | Location |
|---|---|---|---|
| Task assigned to member | `task_assigned` | Assigned member | `tasks.service.ts` |
| Task marked urgent | `urgent` | All current assignees | `tasks.service.ts` |
| Task sent to revisions | `revisions_requested` | Primary assignee only | `tasks.service.ts` |
| User onboarding complete | `general` | New user (welcome) | `onboarding.service.ts` |
| User adds skills at onboarding | `skill_request` | All admins | `onboarding.service.ts` |
| Invite sent / resent | `invite_sent` | All admins | `users.controller.ts` |
| Admin updates member profile | `general` | Affected member | `users.service.ts` |
| Admin updates member skills | `general` | Affected member | `users.service.ts` |

---

## Missing — what needs to be implemented

### 1. Project notifications

| Trigger | Type | Recipients | Notes |
|---|---|---|---|
| Member added to project | `project_member_added` | Added member | Fire from `projects.service → addMember()` |
| Member removed from project | `project_member_removed` | Removed member | Fire from `projects.service → removeMember()` |
| Project status changed | `project_status_changed` | All current project members | e.g. "todo → in_progress", "in_review → approved" |
| Project created with pre-assigned members | `project_member_added` | Each assigned member | If `member_ids[]` passed at create time |
| Project archived | `project_archived` | All current project members | Let them know it was closed |

**Message templates:**

```
project_member_added:   "{actor} added you to project "{project_name}" in {firm_name}."
project_member_removed: "You have been removed from project "{project_name}" by {actor}."
project_status_changed: "Project "{project_name}" status changed to {new_status} by {actor}."
project_archived:       "Project "{project_name}" has been archived."
```

---

### 2. Task notifications (gaps in current implementation)

| Trigger | Type | Recipients | Gap |
|---|---|---|---|
| Task assigned to **multiple** assignees | `task_assigned` | **Every** assignee in `task_assignees` | Current code only notifies `assignee_id` (legacy single assignee), misses multi-assignee rows |
| Task **unassigned** from a member | `task_unassigned` | Removed assignee | Not implemented at all |
| Task status changed (any transition) | `task_status_changed` | All current assignees | Only `revisions_requested` exists; other transitions (in_progress→resolved, resolved→internal_review, etc.) send nothing |
| Task deadline set / changed | `task_deadline_updated` | All current assignees | Not implemented |
| Task approaching deadline (24 h before) | `task_deadline_approaching` | All current assignees | Needs a cron job — runs every hour, checks `deadline = tomorrow AND status NOT IN (completed, blocked)` |
| Task overdue (deadline passed) | `task_overdue` | All current assignees + admins | Needs cron job — runs daily |
| Task moved to a project | `task_project_assigned` | All current assignees | Not implemented |

**Message templates:**

```
task_assigned:             "{actor} assigned you to "{task_title}"."
task_unassigned:           "You were unassigned from "{task_title}" by {actor}."
task_status_changed:       ""{task_title}" status changed from {old_status} to {new_status}."
task_deadline_updated:     "Deadline for "{task_title}" updated to {date} by {actor}."
task_deadline_approaching: ""{task_title}" is due tomorrow ({date})."
task_overdue:              ""{task_title}" is overdue (was due {date})."
task_project_assigned:     ""{task_title}" has been added to project "{project_name}"."
```

---

### 3. Sub-task notifications

Sub-tasks are `tickets` with `parent_task_id` set. All the same rules as tasks apply — currently none of them fire for sub-tasks.

| Trigger | Type | Recipients | Notes |
|---|---|---|---|
| Sub-task created and assigned | `task_assigned` | Assigned member(s) | Same type as task — title should clarify "sub-task" |
| Sub-task unassigned | `task_unassigned` | Removed assignee | Same as task |
| Sub-task status changed | `task_status_changed` | All sub-task assignees | Same as task |
| Sub-task sent to revisions | `revisions_requested` | All sub-task assignees | Currently only fires for top-level tasks |

**Distinguishing sub-tasks in the message:**

Check `ticket.parent_task_id IS NOT NULL` when building the notification message:
```
task_assigned (sub-task):  "{actor} assigned you to sub-task "{sub_task_title}" under "{parent_task_title}"."
```

---

### 4. Chat / mention notifications (inbox design requirement)

These are needed to power the "Mentions" and "Replies" filters in the Figma inbox design.

| Trigger | Type | Recipients | Notes |
|---|---|---|---|
| User @mentioned in a message | `mention` | Mentioned user | Parse `@username` from `body` on message create; look up user by name |
| Reply to your message (`parent_id` set) | `reply` | Author of parent message | On `POST /messages`, if `parent_id` is not null, notify the parent message author |

**Implementation note:**
Mention parsing needs to happen server-side in `messages.service.ts → createMessage()`. After insert, scan `body` for `@word`, look up `users.name ILIKE word`, insert notification for each matched user (skip sender).

---

## Notification type registry (complete list after implementation)

| Type | Inbox filter bucket | Has `ticket_id` |
|---|---|---|
| `task_assigned` | Assigned to me | ✅ |
| `task_unassigned` | — (general) | ✅ |
| `task_status_changed` | — (general) | ✅ |
| `task_deadline_updated` | — (general) | ✅ |
| `task_deadline_approaching` | Overdue (near) | ✅ |
| `task_overdue` | Overdue | ✅ |
| `task_project_assigned` | — (general) | ✅ |
| `revisions_requested` | Assigned to me | ✅ |
| `urgent` | Assigned to me | ✅ |
| `project_member_added` | Assigned to me | ❌ (no ticket_id) |
| `project_member_removed` | — (general) | ❌ |
| `project_status_changed` | — (general) | ❌ |
| `project_archived` | — (general) | ❌ |
| `mention` | Mentions | ✅ (message context) |
| `reply` | Replies | ✅ (message context) |
| `general` | — | ❌ |
| `invite_sent` | — (admin only) | ❌ |
| `skill_request` | — (admin only) | ❌ |

---

## Questions for Anoop (designer) — inbox UX decisions needed

1. **Non-task notifications in inbox**: Types like `project_member_added`, `invite_sent`, `skill_request`, `general` have no `ticket_id`, so there is no thread to open on the right. What should clicking these rows do? Show a plain detail view? Open the relevant page (e.g. click project_member_added → navigate to project)?

2. **"Overdue" filter count source**: Is overdue computed from `notifications` table (requires cron to generate `task_overdue` rows) or computed live from task deadlines? The cron approach means delay; the live approach means no persistent record.

3. **"Clear" vs "Mark as read"**: In the current DB `notifications.read = true` is the only state. "Clear" in the design seems to mean something more permanent (hide from list). Do we need a `cleared_at TIMESTAMPTZ` column, or is `read = true` sufficient for "cleared"?

4. **Sub-task notifications**: Should sub-task activity show in inbox as a separate row, or should it roll up under the parent task thread? E.g. if a sub-task status changes, does that open the sub-task thread or the parent task thread?

5. **Project notifications thread view**: If the inbox shows a `project_member_added` notification, clicking it should show which thread? The project's chat (`scope=project`)? Or just a static detail panel?

6. **Mention + reply (v1 or v2?)**: Implementing `@mention` parsing and `reply` notifications is a meaningful backend feature. Confirm whether this is in scope for the current sprint or a follow-up.

---

## Implementation order (suggested)

**Phase 1 — Fix existing gaps (backend only, no migration needed)**
- [ ] Multi-assignee `task_assigned`: loop over `task_assignees` instead of single `assignee_id`
- [ ] `task_unassigned`: fire when member removed from `task_assignees`
- [ ] `task_status_changed`: fire on every `transitionTask()` call for all assignees
- [ ] `revisions_requested` for sub-tasks: use same code path as parent tasks

**Phase 2 — Project notifications (backend only, no migration)**
- [ ] `project_member_added` in `addProjectMember()`
- [ ] `project_member_removed` in `removeProjectMember()`
- [ ] `project_status_changed` in `updateProject()` when `workflow_status` changes

**Phase 3 — Deadline / overdue (requires cron job)**
- [ ] `task_deadline_approaching`: hourly cron, 24 h window
- [ ] `task_overdue`: daily cron at 08:00, tasks past deadline in active statuses

**Phase 4 — Inbox design requirements (requires Anoop sign-off first)**
- [ ] `mention` parsing in `createMessage()`
- [ ] `reply` notification on threaded messages
- [ ] `cleared_at` column if "Clear" is different from "read"
- [ ] Inbox thread routing for non-task notifications
