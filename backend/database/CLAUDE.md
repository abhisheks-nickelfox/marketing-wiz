# Database Reference — MarketingWiz

## Overview

- **Engine**: Supabase (PostgreSQL 15+)
- **RLS**: Enabled on all tables. The backend uses the **service-role key** (bypasses RLS entirely). RLS policies exist for potential future direct-client access only.
- **ORM**: Sequelize (models in `backend/src/models/`). All business-logic queries go through Sequelize; some read-only analytics use raw SQL via `sequelize.query()`.
- **Migrations**: Apply via **Supabase SQL Editor** only. Never wrap in `BEGIN`/`COMMIT` — Supabase SQL Editor rejects explicit transaction blocks.
- **Migration count**: 001–045 applied (plus `views_and_indexes.sql` after `schema.sql`). See Migration History below.

---

## Schema Application Order

For a fresh database (rare — Supabase project already has everything):

1. `database/legacy/schema.sql` — base tables, indexes, triggers
2. `database/legacy/views_and_indexes.sql` — initial views + extra indexes
3. Migrations 001–043 in order (018 and 019 each have two files — apply both)

---

## Tables

### `users`
Core user profile table. Extends Supabase `auth.users` via FK on `id`.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | References `auth.users(id) ON DELETE CASCADE` |
| `email` | TEXT UNIQUE NOT NULL | Lowercased before insert |
| `name` | TEXT NOT NULL | Display name |
| `first_name` | TEXT | Added migration 023 |
| `last_name` | TEXT | Added migration 023 |
| `phone_number` | TEXT | E.164 format (`+[country][7-15 digits]`); validated at API layer |
| `avatar_url` | TEXT | Supabase Storage URL or base64 data URL fallback (migration 024) |
| `role` | TEXT NOT NULL | `admin`, `member`, `project_manager` (super_admin removed migration 039) |
| `member_role` | TEXT | Job title string; free-text (migration 018b) |
| `status` | TEXT | `Active`, `invited`, `Disabled` — mixed-case, intentional |
| `permissions` | TEXT[] | Granular permission keys (migration 007) |
| `invite_nonce` | TEXT | HMAC token nonce; rotated on every invite/resend (migration 025) |
| `rate_amount` | DECIMAL(10,2) | Billing rate (migration 028b) |
| `rate_frequency` | TEXT | `Hourly`, `Daily`, `Weekly`, `Monthly` |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | May be NULL if trigger hasn't fired — treat as nullable |

**Gotchas**:
- `status` values are mixed-case (`Active` not `active`, `Disabled` not `disabled`). This is intentional — match exactly in queries.
- `updated_at` can be NULL on rows created before migration 001 added the trigger.
- `role` CHECK after migration 039: `('admin', 'member', 'project_manager')` — `super_admin` is gone.
- `invite_nonce` is rotated on every invite/resend — any outstanding onboarding link becomes invalid immediately.

---

### `firms`
Client firm profiles.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `name` | TEXT UNIQUE NOT NULL | |
| `description` | TEXT | |
| `location` | TEXT | |
| `website` | TEXT | Column name is `website`, NOT `website_url`. Migration 028 added `website`; migration 032 added `website_url` — both exist in the DB. The Sequelize model and API use `website`. |
| `website_url` | TEXT | Also exists (migration 032) but NOT in the Sequelize model. Do not use. |
| `logo_url` | TEXT | |
| `contact_name` | TEXT | |
| `contact_email` | TEXT | |
| `contact_role` | TEXT | Job title of primary contact |
| `contact_phone` | TEXT | |
| `account_manager_id` | UUID | FK → `users(id) ON DELETE SET NULL`; indexed |
| `default_prompt_id` | UUID | FK → `prompts(id) ON DELETE SET NULL` |
| `created_at` | TIMESTAMPTZ | |

**Gotchas**:
- The DB has BOTH `website` and `website_url` columns (two migrations added columns of slightly different names). The Sequelize `Firm` model maps to `website` only. Always write to `website`.

---

### `prompts`
AI prompt templates.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `name` | TEXT NOT NULL | |
| `type` | TEXT NOT NULL | `pm`, `campaigns`, `content`, `custom` |
| `system_prompt` | TEXT NOT NULL | The actual prompt text used by AI service |
| `content` | TEXT | Alias/mirror of system_prompt for some API consumers; nullable |
| `firm_id` | UUID | FK → `firms(id) ON DELETE SET NULL`; NULL = global template |
| `is_active` | BOOLEAN | Default true |
| `created_at` | TIMESTAMPTZ | |

**Gotchas**:
- Both `system_prompt` and `content` exist. `system_prompt` is the canonical column used by `ai.service.ts`. `content` was added later for API compatibility — may be NULL on older rows.

---

### `transcripts`
Meeting transcripts from Fireflies or manual entry.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `fireflies_id` | TEXT UNIQUE | NULL for manual transcripts (allowNull: true). Unique constraint still prevents duplicate syncs. |
| `title` | TEXT NOT NULL | |
| `call_date` | TIMESTAMPTZ NOT NULL | |
| `duration_sec` | INTEGER | Default 0 |
| `participants` | TEXT[] / JSONB | Array of participant names |
| `raw_transcript` | TEXT | Full transcript body; default '' |
| `firm_id` | UUID | FK → `firms(id) ON DELETE SET NULL` |
| `archived` | BOOLEAN | Default false |
| `fetched_at` | TIMESTAMPTZ | NULL = manual transcript; set to NOW() on Fireflies sync (migration 006) |
| `source` | TEXT | `fireflies` or NULL for manual |
| `created_at` | TIMESTAMPTZ | |

**Gotchas**:
- `fireflies_id` is nullable — do not add a NOT NULL constraint. Manual transcripts have `fireflies_id = NULL` and `fetched_at = NULL`.

---

### `processing_sessions`
Links a transcript → firm → prompt for one batch of AI ticket generation.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `transcript_id` | UUID NOT NULL | FK → `transcripts(id) ON DELETE CASCADE` |
| `firm_id` | UUID NOT NULL | FK → `firms(id) ON DELETE CASCADE` |
| `prompt_id` | UUID NOT NULL | FK → `prompts(id) ON DELETE RESTRICT` — cannot delete a prompt that was used |
| `text_notes` | TEXT | Optional admin notes passed to AI alongside transcript |
| `ai_raw_output` | JSONB | Raw LLM response before parsing |
| `created_by` | UUID NOT NULL | FK → `users(id) ON DELETE RESTRICT` — **blocks user deletion if sessions exist** |
| `created_at` | TIMESTAMPTZ | |

**Gotchas**:
- `created_by ON DELETE RESTRICT` means you cannot delete a user who has processed transcripts. The API returns 409 with a clear message (guard in `users.service.ts`).
- `prompt_id ON DELETE RESTRICT` means you cannot delete prompts that have been used in sessions.

---

### `tickets`
Core work item. Called "tasks" in frontend-new and the `/api/tasks` endpoints.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `session_id` | UUID | FK → `processing_sessions(id) ON DELETE SET NULL`; NULL for manual tickets |
| `firm_id` | UUID NOT NULL | FK → `firms(id) ON DELETE CASCADE` |
| `assignee_id` | UUID | FK → `users(id) ON DELETE SET NULL`; primary assignee |
| `project_id` | UUID | FK → `projects(id) ON DELETE SET NULL` (migration 020) |
| `task_type_id` | UUID | FK → `task_types(id) ON DELETE SET NULL` (migration 035) |
| `title` | TEXT NOT NULL | |
| `description` | TEXT | |
| `type` | TEXT | Legacy: `task`, `design`, `development`, `account_management` — kept for backward compat |
| `priority` | TEXT | `low`, `normal`, `high`, `urgent` |
| `status` | TEXT | See status values below (migration 030) |
| `change_note` | TEXT | Admin note sent with revision requests |
| `estimated_hours` | DECIMAL(5,2) | |
| `ai_generated` | BOOLEAN | True if created by AI pipeline |
| `edited` | BOOLEAN | True if regenerated at least once |
| `archived` | BOOLEAN | Default false (migration 014) |
| `deadline` | DATE | Nullable (migration 005) |
| `regeneration_count` | INTEGER | Number of AI regenerations (migration 006) |
| `last_regenerated_at` | TIMESTAMPTZ | (migration 006) |
| `revision_count` | INTEGER | Number of revision cycles (migration 016) |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | Auto-updated by trigger |

**Status values** (after migration 030 — old values remapped):
```
to_do, assigned, in_progress, revisions, internal_review, client_review, completed, blocked
```
Old values (`draft`, `approved`, `resolved`, `closed`, `discarded`, `compliance_review`) no longer exist in DB.

---

### `time_logs`
Work session records attached to tickets.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `ticket_id` | UUID NOT NULL | FK → `tickets(id) ON DELETE CASCADE` |
| `user_id` | UUID NOT NULL | FK → `users(id) ON DELETE CASCADE` |
| `hours` | DECIMAL(5,2) NOT NULL | |
| `comment` | TEXT | |
| `log_type` | TEXT | `estimate`, `partial`, `final`, `revision`, `transition` |
| `revision_cycle` | INTEGER | 0 = initial work; 1,2,… = revision cycle number (migration 016) |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | Auto-updated by trigger (migration 013) |

**log_type semantics**:
| Type | Counted in hours totals? | Notes |
|------|--------------------------|-------|
| `partial` | Yes | Regular work session |
| `estimate` | Yes | Time estimate |
| `final` | No | Resolution snapshot — excluded to avoid double-count |
| `revision` | No | Zero-hour section divider; created when admin sends to revisions |
| `transition` | No | Status audit trail; hours = 0 |

---

### `notifications`
Member-facing alerts.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `user_id` | UUID NOT NULL | FK → `users(id)` |
| `ticket_id` | UUID | FK → `tickets(id)` nullable |
| `type` | TEXT NOT NULL | `general`, `ticket_assigned`, `revisions_requested`, etc. Default `general`. Added migration 043. |
| `title` | TEXT | Short heading; nullable. Added migration 043. |
| `message` | TEXT NOT NULL | Notification body |
| `read` | BOOLEAN | Default false |
| `created_at` | TIMESTAMPTZ | |

**Gotchas**:
- `type` and `title` columns were added in migration 043. Rows created before this migration have `type = 'general'` (DB default) and `title = NULL`.

---

### `skills`
Skill catalog — shared across all users.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `name` | TEXT UNIQUE NOT NULL | |
| `category` | TEXT | Optional grouping |
| `description` | TEXT | Added migration 034 |
| `color` | TEXT | Hex/CSS color for UI badges; migration 034 |
| `created_at` | TIMESTAMPTZ | |

---

### `user_skills`
Many-to-many junction: users ↔ skills with experience level.

| Column | Type | Notes |
|--------|------|-------|
| `user_id` | UUID NOT NULL | FK → `users(id) ON DELETE CASCADE` |
| `skill_id` | UUID NOT NULL | FK → `skills(id) ON DELETE CASCADE` |
| `experience` | TEXT | Self-declared level; added migration 027 |
| `created_at` | TIMESTAMPTZ | |
| PK | `(user_id, skill_id)` | |

---

### `member_roles`
Job title catalog (pre-seeded with common titles).

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `name` | TEXT UNIQUE NOT NULL | |
| `created_at` | TIMESTAMPTZ | |

---

### `projects`
Projects scoped to a firm. A firm can have multiple projects; tickets can belong to a project.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `firm_id` | UUID NOT NULL | FK → `firms(id) ON DELETE CASCADE` |
| `name` | TEXT NOT NULL | UNIQUE per firm: `UNIQUE(firm_id, name)` |
| `description` | TEXT | |
| `status` | TEXT | `active`, `archived` |
| `workflow_status` | TEXT | `todo`, `in_progress`, `in_review`, `approved`, `completed` (migration 026) |
| `start_date` | DATE | Migration 033 |
| `end_date` | DATE | Migration 033 |
| `priority` | TEXT | `high`, `medium`, `low`; default `medium` (migration 033) |
| `type` | TEXT | Free-text project type (migration 033) |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | Auto-updated by trigger (migration 043 ensures trigger exists) |

---

### `project_members`
Many-to-many junction: projects ↔ users.

| Column | Type | Notes |
|--------|------|-------|
| `project_id` | UUID NOT NULL | FK → `projects(id) ON DELETE CASCADE` |
| `user_id` | UUID NOT NULL | FK → `users(id) ON DELETE CASCADE` |
| `added_at` | TIMESTAMPTZ | |
| PK | `(project_id, user_id)` | |

---

### `task_assignees`
Many-to-many junction: tickets ↔ users (multi-assignee). Formally migrated in 043; runtime safety net in `database.ts` for dev environments.

| Column | Type | Notes |
|--------|------|-------|
| `task_id` | UUID NOT NULL | FK → `tickets(id) ON DELETE CASCADE` |
| `user_id` | UUID NOT NULL | FK → `users(id) ON DELETE CASCADE` |
| `added_at` | TIMESTAMPTZ | |
| PK | `(task_id, user_id)` | |

---

### `task_types`
Lookup table for ticket/task type definitions (replaces hard-coded CHECK constraint).

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `name` | TEXT UNIQUE NOT NULL | Pre-seeded: `task`, `design`, `development`, `account_management` |
| `description` | TEXT | |
| `color` | TEXT | Hex/CSS color |
| `created_at` | TIMESTAMPTZ | |

---

### `task_type_members`
Many-to-many: task_types ↔ users (default team per task type).

| Column | Type | Notes |
|--------|------|-------|
| `task_type_id` | UUID NOT NULL | FK → `task_types(id) ON DELETE CASCADE` |
| `user_id` | UUID NOT NULL | FK → `users(id) ON DELETE CASCADE` |
| `added_at` | TIMESTAMPTZ | |
| PK | `(task_type_id, user_id)` | |

---

### `messages`
Threaded messages scoped to a firm or project.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `scope` | TEXT | `firm`, `project`, or `task` (migration 045) |
| `scope_id` | UUID | Points to `firms.id`, `projects.id`, or `tickets.id` — polymorphic, no DB FK (application validates) |
| `user_id` | UUID NOT NULL | FK → `users(id) ON DELETE CASCADE` |
| `parent_id` | UUID | Self-referencing FK → `messages(id) ON DELETE CASCADE`; NULL = top-level |
| `body` | TEXT NOT NULL | 1–10,000 characters |
| `deleted_at` | TIMESTAMPTZ | NULL = active; soft-delete pattern |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | Auto-updated by trigger |

---

### `message_reactions`
Emoji reactions on messages (one per user per emoji per message).

| Column | Type | Notes |
|--------|------|-------|
| `message_id` | UUID NOT NULL | FK → `messages(id) ON DELETE CASCADE` |
| `user_id` | UUID NOT NULL | FK → `users(id) ON DELETE CASCADE` |
| `emoji` | TEXT NOT NULL | 1–8 characters |
| PK | `(message_id, user_id, emoji)` | |

---

### `message_attachments`
File metadata for message attachments (files in Supabase Storage).

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `message_id` | UUID NOT NULL | FK → `messages(id) ON DELETE CASCADE` |
| `file_url` | TEXT NOT NULL | Supabase Storage URL |
| `file_name` | TEXT NOT NULL | |
| `file_size` | INTEGER NOT NULL | Bytes; CHECK > 0 |
| `created_at` | TIMESTAMPTZ | |

---

### `project_attachments`
File metadata for project-level attachments (briefs, brand guidelines, etc.).

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `project_id` | UUID NOT NULL | FK → `projects(id) ON DELETE CASCADE` |
| `file_url` | TEXT NOT NULL | |
| `file_name` | TEXT NOT NULL | |
| `file_size` | INTEGER NOT NULL | Bytes; CHECK > 0 |
| `file_type` | TEXT | MIME type; validated at API layer |
| `uploaded_by` | UUID | FK → `users(id) ON DELETE SET NULL` — kept on user deletion |
| `created_at` | TIMESTAMPTZ | |

---

### `active_timers`
Live stopwatch state per user. One row per user max (UNIQUE on `user_id`).

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `user_id` | UUID NOT NULL UNIQUE | FK → `users(id) ON DELETE CASCADE` |
| `ticket_id` | UUID | FK → `tickets(id) ON DELETE CASCADE`; nullable (timer can start without ticket) |
| `started_at` | TIMESTAMPTZ NOT NULL | Elapsed = `NOW() - started_at` computed at read time |

---

### `org_settings`
Organisation-level settings (logo, branding). Single-row table seeded by migration 041.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `logo_url` | TEXT | Supabase Storage URL in `org-logos` bucket |
| `created_at` | TIMESTAMPTZ NOT NULL | |
| `updated_at` | TIMESTAMPTZ NOT NULL | Auto-updated by trigger |

Always fetch the first row — there is only one. `GET /api/settings` returns it; never insert a second row.

---

## Views

### `v_tickets_full`
Tickets enriched with firm name, project name, assignee details, and aggregated time. Current definition from migration 030.

**Columns**: all `tickets` columns + `firm_name`, `project_name`, `assignee_user_id`, `assignee_name`, `assignee_email`, `total_hours_spent`, `time_log_count`.

**Time aggregation**: excludes `final`, `revision`, and `transition` log types to avoid double-counting.

**When to use**: ticket list endpoints, admin dashboard, any query needing joined data in one hit. Avoid for write operations — always write to `tickets` directly.

---

### `v_firm_ticket_stats`
Per-firm aggregate counts. Rebuilt in migration 043 to use migration-030 status vocabulary.

**Columns**: `firm_id`, `firm_name`, `contact_name`, `contact_email`, `firm_created_at`, `total_tickets`, `draft_count` (where status = `to_do`), `approved_count` (where status = `completed`), `in_progress_count`, `assigned_count`, `total_hours_spent`, `last_ticket_at`.

**Note**: The column names `draft_count` and `approved_count` are kept for API backward-compatibility but now count `to_do` and `completed` respectively.

---

### `v_team_workload`
Per-member workload. Current definition from migration 039 (latest rebuild).

**Columns**: `user_id`, `name`, `email`, `total_assigned`, `active_tickets` (status IN `assigned`, `in_progress`, `revisions`), `resolved_tickets` (status = `completed`), `draft_tickets` (status = `to_do`), `total_hours_logged`.

**Hours**: excludes `final`, `revision`, `transition` log types.

**Scope**: only `member` and `project_manager` roles appear. Admins are excluded.

---

## Key Indexes

| Index | Table | Serves |
|-------|-------|--------|
| `idx_tickets_firm_status` | `tickets(firm_id, status)` WHERE archived=false | Most common admin list query |
| `idx_tickets_assigned_assignee` | `tickets(assignee_id)` WHERE status='assigned' | Member dashboard |
| `idx_tickets_to_do_firm_created_at` | `tickets(firm_id, created_at DESC)` WHERE status='to_do' | Draft queue per firm |
| `idx_tickets_overdue_deadline` | `tickets(deadline)` WHERE deadline IS NOT NULL AND active statuses | Overdue ticket queries |
| `idx_tickets_task_type_id` | `tickets(task_type_id)` WHERE NOT NULL | Task type joins |
| `idx_task_assignees_task_id` | `task_assignees(task_id)` | Assignee lookup per ticket |
| `idx_task_assignees_user_id` | `task_assignees(user_id)` | Tickets assigned to a user |
| `idx_processing_sessions_prompt_id` | `processing_sessions(prompt_id)` | Prompt usage audit (migration 043) |
| `idx_processing_sessions_created_by` | `processing_sessions(created_by)` | User deletion guard (migration 043) |
| `idx_user_skills_skill_id` | `user_skills(skill_id)` | Skill catalog joins, cascade deletes (migration 043) |
| `idx_notifications_user_unread` | `notifications(user_id, read)` WHERE read=false | Unread count endpoint (polled frequently) |
| `idx_firms_account_manager_id` | `firms(account_manager_id)` WHERE NOT NULL | "Which firms does user X manage?" |
| `idx_project_members_project_id` | `project_members(project_id)` | Project member list |
| `idx_project_members_user_id` | `project_members(user_id)` | User's project memberships |
| `idx_messages_scope` | `messages(scope, scope_id, created_at)` WHERE deleted_at IS NULL | Message feed per context |
| `idx_notifications_user_unread` | `notifications(user_id, read)` WHERE read=false | Unread count |

---

## RLS Policy Summary

Backend uses service-role key → bypasses all RLS. Policies below are for direct-client safety only.

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| `users` | own row (member) / all (admin) | — | own row | admin only |
| `firms` | all authenticated | admin | admin | admin |
| `prompts` | all authenticated | admin | admin | admin |
| `transcripts` | all authenticated | admin | admin | admin |
| `processing_sessions` | all authenticated | admin | — | — |
| `tickets` | admin: all; member: own assigned | admin | admin: full; member: own | admin |
| `time_logs` | all authenticated | member/admin | own row | own row |
| `notifications` | own rows | service-role | own rows | own rows (migration 043) |
| `skills` | all | admin | admin/project_manager (migration 040) | admin |
| `user_skills` | all | admin | admin | admin |
| `member_roles` | all | admin | — | admin |
| `projects` | all authenticated | admin | admin | admin |
| `project_members` | all | admin/project_manager | — | admin/project_manager |
| `task_assignees` | all | admin/project_manager | — | admin/project_manager |
| `task_types` | all | admin | admin | admin |
| `task_type_members` | all | admin | — | admin |
| `messages` | authenticated (non-deleted) | own user_id | own or admin | admin |
| `message_reactions` | authenticated | own user_id | — | own or admin |
| `message_attachments` | authenticated | authenticated | — | admin |
| `project_attachments` | authenticated | admin/project_manager | — | admin |
| `active_timers` | own or admin | own user_id | own | own or admin |
| `org_settings` | all | — | admin | — |

---

## Known Constraints and Gotchas

**`firms.website` vs `firms.website_url`**
Migration 028 added `website`; migration 032 added `website_url`. Both columns exist in the DB. The Sequelize `Firm` model and all service code use `website`. Never write to `website_url` from application code.

**Mixed-case `users.status`**
Values are `Active`, `invited`, `Disabled` — not lowercase. Match exactly in WHERE clauses and model comparisons.

**`users.updated_at` nullable**
May be NULL on rows created before migration 001 added the auto-update trigger. Always treat as `string | null` in TypeScript.

**`processing_sessions.created_by` blocks user deletion**
FK is ON DELETE RESTRICT. `users.service.ts` checks for existing sessions and returns 409 before attempting the delete, surfacing a clear error message instead of a PostgreSQL FK violation 500.

**`prompts.content` may be NULL**
The column was added later for API compatibility. Older rows have `system_prompt` populated but `content = NULL`. The AI service reads `system_prompt` — `content` is for API consumers that expect that field name.

**Manual transcripts have `fireflies_id = NULL`**
`transcripts.fireflies_id` has a UNIQUE constraint but is nullable. NULL values do not conflict with the unique index in PostgreSQL. Never add NOT NULL here.

**`notifications.type` and `notifications.title` pre-migration 043**
Rows created before migration 043 have `type = 'general'` (DB DEFAULT applied retroactively) and `title = NULL`. Both are safe — the model declares `title` as `string | null`.

**`v_firm_ticket_stats` column names post-migration 043**
`draft_count` now counts `status = 'to_do'` (was `draft`). `approved_count` now counts `status = 'completed'` (was `approved`). Column names are kept for API backward-compat — do not change them.

**`task_assignees` dual-path creation**
The table is created by both migration 043 and the startup safety net in `database.ts → applyMissingSchema()`. The safety net is intentionally retained for dev environments that haven't run the migration yet. Both paths use `CREATE TABLE IF NOT EXISTS` — safe to run twice.

**Messages polymorphic `scope_id`**
`messages.scope_id` has no FK — it is a polymorphic UUID pointing to `firms.id`, `projects.id`, or `tickets.id` depending on `messages.scope`. Application layer must validate the referenced row exists before inserting.

**Migration 001 uses BEGIN/COMMIT**
`001_schema_fixes.sql` wraps statements in an explicit transaction block. It cannot be re-run via Supabase SQL Editor. Extract individual statements if any need re-applying.

**Migrations 018 and 019 each have two files**
`018_add_transition_log_type.sql` and `018_skills_and_user_skills.sql` are both numbered 018. Same for 019. Apply both files in each pair — they are independent and non-conflicting.

---

## Migration History (001–043)

| # | File | What it does |
|---|------|--------------|
| 001 | `001_schema_fixes.sql` | Fix v_team_workload cross-join, indexes, NOT NULL constraints, `firms.name UNIQUE`, `users.updated_at`. **Uses BEGIN/COMMIT — do NOT re-run** |
| 002 | `002_manual_tickets.sql` | CHECK constraint for session_id vs ai_generated invariant |
| 003 | `003_ticket_delete.sql` | Partial index for discarded ticket queries |
| 004 | `004_add_last_ticket_at.sql` | Add `last_ticket_at` to `v_firm_ticket_stats` |
| 005 | `005_add_deadline.sql` | Add `tickets.deadline DATE` nullable |
| 006 | `006_optimize_transcript_tickets.sql` | Add `transcripts.fetched_at`, `tickets.regeneration_count`, `tickets.last_regenerated_at`; FK indexes |
| 006b | `006_notifications.sql` | Create `notifications` table with RLS |
| 007 | `007_add_permissions.sql` | Add `users.permissions TEXT[]` |
| 008 | `008_add_super_admin_role.sql` | Extend role CHECK to include `super_admin` |
| 009 | `009_super_admin_rls.sql` | `current_user_role()` normalises super_admin → admin for RLS |
| 010 | `010_fix_notifications_rls.sql` | Enable RLS on notifications; SELECT/INSERT/UPDATE policies |
| 011 | `011_update_v_tickets_full.sql` | Add deadline, regeneration_count, last_regenerated_at to v_tickets_full |
| 012 | `012_estimated_hours_convention.sql` | Documents DECIMAL(5,2) convention for fractional hours |
| 013 | `013_time_logs_updated_at.sql` | Add `time_logs.updated_at` with auto-update trigger |
| 014 | `014_add_archived_to_tickets.sql` | Add `tickets.archived BOOLEAN` with partial index |
| 015 | `015_expand_ticket_status.sql` | Expand status to 10-value set; rename `approved` → `in_progress` |
| 016 | `016_revision_tracking.sql` | Add `time_logs.revision_cycle`, `tickets.revision_count`; expand log_type CHECK |
| 017 | `017_fix_v_team_workload.sql` | Rebuild v_team_workload; correct active filter; exclude final/revision from hours |
| 018a | `018_add_transition_log_type.sql` | Add `transition` to `time_logs.log_type` CHECK |
| 018b | `018_skills_and_user_skills.sql` | Create `skills` + `user_skills`; add `users.member_role`, `users.status` |
| 019a | `019_fix_revision_marker_cycles.sql` | Fix revision cycle numbering on existing revision marker logs |
| 019b | `019_member_roles.sql` | Create `member_roles`; seed 10 job titles; RLS |
| 020 | `020_add_projects.sql` | Create `projects`; add `tickets.project_id` FK; auto-update trigger; RLS |
| 021 | `021_update_v_tickets_full_projects.sql` | Update v_tickets_full to include project metadata |
| 022 | `022_overdue_tickets_indexes.sql` | Performance indexes for overdue ticket queries |
| 023 | `023_user_profile_fields.sql` | Add `users.first_name`, `last_name`, `phone_number`; back-fills from `name` |
| 024 | `024_user_avatar.sql` | Add `users.avatar_url`; create Storage bucket `avatars` (public, 2MB, image/*) |
| 025 | `025_invite_nonce.sql` | Add `users.invite_nonce TEXT NULL`; rotated on each invite/resend |
| 026 | `026_project_members_workflow_status.sql` | Add `projects.workflow_status`; create `project_members` junction with RLS |
| 027 | `027_user_skills_experience.sql` | Add `user_skills.experience TEXT` |
| 028a | `028_firm_extended_fields.sql` | Add `firms.location`, `website`, `logo_url`, `description`, `contact_role`, `contact_phone`, `account_manager_id` |
| 028b | `028_user_rate.sql` | Add `users.rate_amount DECIMAL(10,2)`, `users.rate_frequency TEXT` |
| 029 | `029_drop_member_roles.sql` | Drops the member_roles table (if superseded by free-text `users.member_role`) |
| 030 | `030_new_task_status_system.sql` | Replace 10-value status set with 8-value set; remap data; rebuild views and indexes |
| 031 | `031_add_project_manager_role.sql` | Add `project_manager` to role CHECK; update v_team_workload |
| 032 | `032_firms_extended_profile.sql` | Add `firms.website_url` (separate from `website`), `logo_url`, `contact_role`, `contact_phone`, `account_manager_id` with FK index |
| 033 | `033_projects_dates_priority_type.sql` | Add `projects.start_date`, `end_date`, `priority`, `type` |
| 034 | `034_skills_description_color.sql` | Add `skills.description`, `skills.color` |
| 035 | `035_task_types_table.sql` | Create `task_types` catalog; add `tickets.task_type_id` FK; seed 4 default types |
| 036 | `036_messages_system.sql` | Create `messages`, `message_reactions`, `message_attachments` with RLS |
| 037 | `037_project_attachments.sql` | Create `project_attachments` with RLS |
| 038 | `038_active_timers.sql` | Create `active_timers` (live stopwatch state per user) with RLS |
| 039 | `039_remove_super_admin_role.sql` | Remove super_admin; merge into admin; update role CHECK and views |
| 040 | `040_skills_update_policy.sql` | Add UPDATE RLS policy for skills table |
| 041 | `041_org_settings.sql` | Create `org_settings` table; seed one default row; create Storage bucket `org-logos` |
| 042 | `042_task_type_members.sql` | Create `task_type_members` junction (task_types ↔ users default team) |
| 043 | `043_production_fixes.sql` | Formal `task_assignees` migration; rebuild `v_firm_ticket_stats`; add `notifications.type`/`title`; FK indexes; `projects` updated_at trigger |
| 044 | `044_add_parent_task_id.sql` | Add `tickets.parent_task_id UUID` FK → `tickets(id) ON DELETE CASCADE`; partial index for sub-task lookups |
| 045 | `045_messages_add_task_scope.sql` | Extend `messages.scope` CHECK to include `'task'` so messages can be threaded under individual tasks |

---

## Adding New Migrations

**Naming**: `NNN_descriptive_name.sql` where NNN is the next available number after 043.

**Location**: `backend/database/migrations/`

**Rules**:
- Never wrap in `BEGIN`/`COMMIT`
- Always use `IF NOT EXISTS` / `CREATE OR REPLACE` / `DROP ... IF EXISTS` for idempotency
- Apply via Supabase SQL Editor
- After applying, update this file's Migration History table
- If the migration adds columns that the Sequelize models read, update the model in `backend/src/models/` and rebuild: `npm run build`
- If the migration changes status values or view logic, check `backend/src/config/constants.ts` for any runtime arrays that need updating
