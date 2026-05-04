# AI Wealth Connections — Technical Development Roadmap
**Version:** 1.0  
**Date:** April 2026  
**Base:** 6-Week Figma-Driven Plan + Codebase Audit  
**Stack:** React 19 + TypeScript + Vite (frontend-new) · Express + TypeScript (backend) · Supabase/PostgreSQL

---

## Table of Contents

1. [Project Context](#1-project-context)
2. [Current State — What Exists Today](#2-current-state--what-exists-today)
3. [Critical Conflicts — Fix Before Week 2](#3-critical-conflicts--fix-before-week-2)
4. [Database Migrations Required (029–037)](#4-database-migrations-required-029037)
5. [Week-by-Week Feature Plan](#5-week-by-week-feature-plan)
   - [Week 2 — Admin Settings & Firm Management](#week-2--admin-settings--firm-management)
   - [Week 3 — Project Management & Task Workflows](#week-3--project-management--task-workflows)
   - [Week 4 — Inbox & Personal Timesheet](#week-4--inbox--personal-timesheet)
   - [Week 5 — Time Reporting](#week-5--time-reporting)
   - [Week 6 — Team Pulse, Integration & QA](#week-6--team-pulse-integration--qa)
6. [New API Endpoints Required](#6-new-api-endpoints-required)
7. [New Frontend Pages & Components](#7-new-frontend-pages--components)
8. [Dependency Build Order](#8-dependency-build-order)
9. [Missing Figma Designs — Development Blocked](#9-missing-figma-designs--development-blocked)
10. [Immediate Action Checklist](#10-immediate-action-checklist)

---

## 1. Project Context

AI Wealth Connections is a team and project management SaaS for wealth management agencies. The `frontend-new/` directory is the **active development target** (React 19 + TypeScript). The legacy `frontend/` directory is kept for reference only — all new work goes into `frontend-new/`.

**Production URLs:**
- Frontend: `https://app.aiwealthconnections.com`
- Backend API: `https://api.aiwealthconnections.com/api`

**Repos:**
- Frontend: `https://github.com/Nickelfox/marketingwiz-ai-FE` (remote: `nickelfox`, branch: `check`)
- Backend: `https://github.com/Nickelfox/marketingwiz-ai-BE` (remote: `nickelfox`)

---

## 2. Current State — What Exists Today

### 2.1 Frontend Pages (frontend-new/)

| Route | File | Status |
|-------|------|--------|
| `/login` | `pages/auth/Login.tsx` | Done |
| `/forgot-password` | `pages/auth/ForgotPassword.tsx` | Done |
| `/reset-password` | `pages/auth/ResetPasswordPage.tsx` | Done |
| `/onboarding?token=` | `pages/onboarding/OnboardingPage.tsx` | Done |
| `/dashboard` | `pages/Dashboard.tsx` | Done — needs status data update |
| `/users` | `pages/UsersPage.tsx` | Done — needs pagination |
| `/users/new` | `pages/AddUserPage.tsx` | Done — invite broken (see §3) |
| `/users/:id/settings` | `pages/UserSettingsPage.tsx` | Done |
| `/settings` | `pages/SettingsPage.tsx` | Personal Info done · Org/Project tabs are placeholders |
| `/inbox` | `pages/InboxPage.tsx` | Basic shell only — needs full rebuild |
| `/transcripts` | `pages/TranscriptsFlowPage.tsx` | Done |
| `/transcripts/:id/tasks` | `pages/TranscriptTasksPage.tsx` | Done |
| `/firms/:id` | `pages/FirmDetailPage.tsx` | Basic — needs tabs, communications, sidebar |
| `/projects` | ❌ Missing | Not built |
| `/projects/:id` | ❌ Missing | Not built |
| `/my-tasks` | ❌ Missing | Not built |
| `/timesheet` | ❌ Missing | Not built |
| `/time-reports` | ❌ Missing | Not built |
| `/team-pulse` | ❌ Missing | Not built |
| `/firms/new` | ❌ Missing | Not built (simple form existed, needs 3-step wizard) |

### 2.2 Database Tables

| Table | Exists | Notes |
|-------|--------|-------|
| `users` | ✅ | Has rate_amount/rate_frequency in code but migration 028 not on production |
| `firms` | ✅ | Missing: location, website, logo, contact_role, contact_phone, account_manager_id |
| `prompts` | ✅ | Complete |
| `transcripts` | ✅ | Complete |
| `processing_sessions` | ✅ | Complete |
| `tickets` | ✅ | Wrong status values — see §3 Conflict 1 |
| `time_logs` | ✅ | Complete |
| `notifications` | ✅ | Complete |
| `skills` | ✅ | Missing: description, color |
| `user_skills` | ✅ | Complete (has experience) |
| `member_roles` | ✅ | Complete |
| `projects` | ✅ | Missing: start_date, end_date, priority, type |
| `project_members` | ✅ | Complete |
| `task_types` | ❌ | Not built — currently a static enum on tickets.type |
| `messages` | ❌ | Not built — needed for firm/project chat |
| `message_reactions` | ❌ | Not built |
| `message_attachments` | ❌ | Not built |
| `project_attachments` | ❌ | Not built |
| `active_timers` | ❌ | Not built — needed for global header timer |

### 2.3 Backend Modules

| Module | Exists | Notes |
|--------|--------|-------|
| `auth` | ✅ | Complete including onboarding |
| `users` | ✅ | Complete |
| `skills` | ✅ | CRUD complete — needs edit endpoint |
| `member-roles` | ✅ | Complete |
| `firms` | ✅ | Needs update for new fields + logo upload |
| `projects` | ✅ | Needs update for new fields |
| `tasks` (tickets) | ✅ | Needs status system overhaul |
| `transcripts` | ✅ | Complete |
| `prompts` | ✅ | Complete |
| `notifications` | ✅ | Complete |
| `dashboard` | ✅ | Needs update for new status system |
| `task-types` | ❌ | Not built |
| `messages` | ❌ | Not built |
| `timesheet` | ❌ | Not built |
| `timers` | ❌ | Not built |
| `reports` | ❌ | Not built |
| `team-pulse` | ❌ | Not built |

---

## 3. Critical Conflicts — Fix Before Week 2

These conflicts exist between the current codebase and the Figma-driven roadmap. All must be resolved before Week 2 features are built.

---

### Conflict 1 — Task Status System Mismatch (BLOCKER)

**Severity:** Critical  
**Blocks:** Every task-related UI, dashboard counts, filter panels, status transitions

**Current DB statuses:**
```
draft · in_progress · resolved · internal_review · client_review ·
compliance_review · approved · closed · revisions · discarded
```

**Required statuses (from Figma):**
```
to_do · assigned · in_progress · revisions · internal_review ·
client_review · completed · blocked
```

**What changes:**
- `draft` → `to_do`
- `approved` (old meaning: ticket assigned+approved) → `assigned`
- `resolved` → `completed`
- `compliance_review` → removed (maps to `internal_review`)
- `closed` → `completed`
- `discarded` → removed
- `blocked` → new status (no equivalent)
- `assigned` → new status (no equivalent)

**Files to update after migration:**

*Backend:*
- `backend/src/config/constants.ts` — `STATUS_PRIORITY`, `VALID_STATUSES`, `VALID_TRANSITIONS`, `PAST_DEADLINE_STATUSES`
- `backend/src/modules/tasks/tasks.validation.ts`
- `backend/src/modules/tasks/tasks.service.ts` — transition logic
- `backend/src/modules/dashboard/dashboard.service.ts` — status-based queries

*Frontend:*
- `frontend-new/src/lib/constants.ts` — status colour map
- `frontend-new/src/lib/api.ts` — `Task.status` type union
- `frontend-new/src/components/tasks/TaskBadges.tsx`
- `frontend-new/src/components/dashboard/DonutChart.tsx`
- `frontend-new/src/pages/Dashboard.tsx`

---

### Conflict 2 — `project_manager` Role Not in DB (CAUSES PRODUCTION 400)

**Severity:** Critical — invite user returns 400 Validation failed on production  
**Root cause:** `VALID_ROLES` array in `constants.ts` includes `project_manager` but the `users` table role CHECK constraint only allows `admin · member · super_admin` (migration 008).

**Fix:** Apply migration 030 (see §4) then rebuild backend dist on production.

---

### Conflict 3 — Migration 028 Not Applied on Production (CAUSES PRODUCTION 500)

**Severity:** Critical  
**Symptom:** After fixing Conflict 2, user creation will fail with Supabase column-not-found error because `users.service.ts` inserts `rate_amount` and `rate_frequency` which don't exist on production DB.

**Fix:** Apply migration 028 in Supabase SQL Editor, then `npm run build` on production server.

---

### Conflict 4 — Permissions Keys Mismatch

**Severity:** Medium  
**Current keys in `users.permissions[]`:**
```
manage_firms · manage_projects · process_transcripts · view_all_tickets · manage_prompts
```
**Figma Extra Permissions checkboxes:**
```
Project Creation · Task Creation · Global Timesheet
```
**Fix:** Add new permission key strings to `constants.ts` and `types/index.ts`. Do not remove old keys — existing middleware depends on them. New keys: `create_projects`, `create_tasks`, `global_timesheet`.

---

### Conflict 5 — Firms Table Missing Fields

**Severity:** High — blocks Week 2 Add Firm Wizard  
**Current firms columns:** `id · name · contact_name · contact_email · default_prompt_id · created_at`  
**Required:** location · website_url · logo_url · description · contact_role · contact_phone · account_manager_id  
**Fix:** Migration 031 (see §4)

---

### Conflict 6 — Projects Table Missing Fields

**Severity:** High — blocks Week 3 Create Project Modal  
**Current projects columns:** `id · firm_id · name · description · status · workflow_status · created_at · updated_at`  
**Required:** start_date · end_date · priority · type  
**Fix:** Migration 032 (see §4)

---

### Conflict 7 — Skills Table Missing Fields

**Severity:** Medium — blocks Week 2 Org Settings Skills tab  
**Current skills columns:** `id · name · category · created_at`  
**Required:** description · color (for 16-colour picker)  
**Fix:** Migration 033 (see §4)

---

### Conflict 8 — Task Types Are a Static Enum (Not a Catalog)

**Severity:** High — blocks Week 2 Project Settings → Task Types  
**Current:** `tickets.type CHECK (type IN ('task','design','development','account_management'))` — hardcoded  
**Required:** A `task_types` table that admins can create/edit/delete dynamically  
**Fix:** Migration 034 — new table + add nullable `task_type_id FK` column to tickets

---

### Conflict 9 — No Chat/Communications System

**Severity:** High — blocks Week 2 Firm Communications tab and Week 3 Project Activity panel  
**Current:** Only `notifications` table (one-way alerts, no threading)  
**Required:** `messages` table with threading, reactions, and file attachments  
**Fix:** Migrations 035, 035b (see §4)

---

### Conflict 10 — No Global Timer

**Severity:** Medium — blocks Week 4 timer widget in Header  
**Current:** `time_logs` records completed time entries only — no in-progress timer state  
**Required:** `active_timers` table to persist running timer per user  
**Fix:** Migration 037 (see §4)

---

## 4. Database Migrations Required (029–037)

Apply all via Supabase SQL Editor. Do NOT wrap in `BEGIN`/`COMMIT`.

---

### Migration 029 — New Task Status System
```sql
-- Step 1: Drop and recreate CHECK constraint
ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_status_check;
ALTER TABLE tickets
  ADD CONSTRAINT tickets_status_check
  CHECK (status IN (
    'to_do', 'assigned', 'in_progress', 'revisions',
    'internal_review', 'client_review', 'completed', 'blocked'
  ));

-- Step 2: Migrate existing data
UPDATE tickets SET status = 'to_do'           WHERE status = 'draft';
UPDATE tickets SET status = 'assigned'        WHERE status = 'approved' AND assignee_id IS NOT NULL;
UPDATE tickets SET status = 'in_progress'     WHERE status = 'approved' AND assignee_id IS NULL;
UPDATE tickets SET status = 'completed'       WHERE status IN ('resolved', 'closed');
UPDATE tickets SET status = 'internal_review' WHERE status = 'compliance_review';
UPDATE tickets SET status = 'to_do'           WHERE status = 'discarded';

-- Step 3: Update v_tickets_full view
DROP VIEW IF EXISTS v_tickets_full;
-- (recreate view — copy from migration 021 and change status references)
```

---

### Migration 030 — Add `project_manager` to Role CHECK
```sql
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin', 'member', 'project_manager', 'super_admin'));
```

---

### Migration 031 — Extend Firms Table
```sql
ALTER TABLE firms
  ADD COLUMN IF NOT EXISTS description        TEXT,
  ADD COLUMN IF NOT EXISTS location           TEXT,
  ADD COLUMN IF NOT EXISTS website_url        TEXT,
  ADD COLUMN IF NOT EXISTS logo_url           TEXT,
  ADD COLUMN IF NOT EXISTS contact_role       TEXT,
  ADD COLUMN IF NOT EXISTS contact_phone      TEXT,
  ADD COLUMN IF NOT EXISTS account_manager_id UUID REFERENCES users(id) ON DELETE SET NULL;
```

---

### Migration 032 — Extend Projects Table
```sql
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date   DATE,
  ADD COLUMN IF NOT EXISTS priority   TEXT CHECK (priority IN ('high', 'medium', 'low')),
  ADD COLUMN IF NOT EXISTS type       TEXT;
```

---

### Migration 033 — Extend Skills Table
```sql
ALTER TABLE skills
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS color       TEXT;
```

---

### Migration 034 — Task Types Catalog
```sql
CREATE TABLE IF NOT EXISTS task_types (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,
  description TEXT,
  color       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS task_type_id UUID REFERENCES task_types(id) ON DELETE SET NULL;

-- Seed from existing enum values
INSERT INTO task_types (name) VALUES
  ('Task'), ('Design'), ('Development'), ('Account Management')
ON CONFLICT (name) DO NOTHING;

-- RLS
ALTER TABLE task_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all_read_task_types"  ON task_types FOR SELECT USING (true);
CREATE POLICY "admin_write_task_types" ON task_types FOR ALL
  USING (current_user_role() IN ('admin', 'super_admin'));
```

---

### Migration 035 — Messages System
```sql
CREATE TABLE IF NOT EXISTS messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope      TEXT NOT NULL CHECK (scope IN ('firm', 'project')),
  scope_id   UUID NOT NULL,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_id  UUID REFERENCES messages(id) ON DELETE CASCADE,
  body       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS message_reactions (
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  emoji      TEXT NOT NULL,
  PRIMARY KEY (message_id, user_id, emoji)
);

CREATE TABLE IF NOT EXISTS message_attachments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  file_url   TEXT NOT NULL,
  file_name  TEXT,
  file_size  INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_scope ON messages(scope, scope_id);
CREATE INDEX idx_messages_parent ON messages(parent_id);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members_read_messages"  ON messages FOR SELECT USING (true);
CREATE POLICY "members_write_messages" ON messages FOR INSERT WITH CHECK (true);
```

---

### Migration 036 — Project Attachments
```sql
CREATE TABLE IF NOT EXISTS project_attachments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  file_url    TEXT NOT NULL,
  file_name   TEXT,
  file_size   INTEGER,
  file_type   TEXT,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE project_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members_read_attachments" ON project_attachments FOR SELECT USING (true);
CREATE POLICY "admin_write_attachments"  ON project_attachments FOR ALL
  USING (current_user_role() IN ('admin', 'super_admin', 'project_manager'));
```

---

### Migration 037 — Active Timers (Global Header Timer)
```sql
CREATE TABLE IF NOT EXISTS active_timers (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  ticket_id  UUID REFERENCES tickets(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE active_timers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_timer" ON active_timers FOR ALL USING (user_id = auth.uid());
```

---

## 5. Week-by-Week Feature Plan

---

### Week 2 — Admin Settings & Firm Management

**Status:** Up next  
**Goal:** Settings pages functional, Add Firm 3-step wizard, Firm overview with tabs

#### 2.1 Personal Info (Settings — already mostly done)
- [ ] 2FA setup wizard — Step 1: Choose method (Auth App / Email) → Step 2: Verify code
  - Backend: integrate Supabase MFA (`supabase.auth.mfa.*`)
  - Frontend: two-step modal flow in `SettingsPage.tsx`

#### 2.2 Organisation Info — Details Tab
- [ ] Replace "Coming soon" placeholder
- [ ] Logo upload (drag & drop, same `ImageCropModal` component)
- [ ] Org name, timezone fields (store in a new `org_settings` table or env config)

#### 2.3 Organisation Info — Skills Tab (upgrade existing)
- [ ] Add colour picker (16 swatches) to Create Skill slide-out
- [ ] Add description field to Create Skill slide-out
- [ ] Add edit skill — currently missing (Figma gap — implement as "edit mode" of create slide-out)
- [ ] Show "Members with Skill" avatar cluster in skills table (query `user_skills`)
- [ ] Show "Ongoing usage count" in skills table (query `tickets` by skill tag — design decision needed)

#### 2.4 Project Settings Tab — Task Types
- [ ] New `task-types` backend module: `GET /api/task-types`, `POST /api/task-types`, `DELETE /api/task-types/:id`
- [ ] Task Type Management table in `SettingsPage` Project Settings tab
- [ ] "Create A Task Type" slide-out: name, description, 16-colour picker
- [ ] Edit task type — implement as edit mode of same slide-out (Figma gap)

#### 2.5 Add Firm — 3-Step Wizard (new page)
- [ ] Route: `/firms/new` — replace with stepper page
- [ ] Step 1: Firm details (name, location/country dropdown, website URL, logo upload, description)
- [ ] Step 2: Primary contact (name, role, email, phone with country code picker)
- [ ] Step 3: Account Manager picker (grid of users with avatar + name)
- [ ] Step progress indicator component
- [ ] Backend: extend `POST /api/firms` to accept all new fields + `PATCH /api/firms/:id`

#### 2.6 Firm Overview — Upgrade FirmDetailPage
- [ ] Tab bar: Overview / Client Requests / Projects / Time Reports / Notes
- [ ] Overview tab: firm logo + name header, About text, Quick Links panel (DropBox/Reports/HubSpot tiles)
- [ ] Right sidebar: Location, Website link, Point of Contact card, Account Manager card
- [ ] Communications tab: threaded chat using `messages` table
  - `GET /api/firms/:id/messages` — list messages with author info
  - `POST /api/firms/:id/messages` — create message (body, optional parent_id for thread)
  - Message bubbles component: avatar, name, timestamp, body, reaction row, reply button
  - Text composer at bottom
- [ ] Client Requests tab: placeholder only (no Figma design)
- [ ] Firms sidebar: dynamic alphabetical list in `Sidebar.tsx` (query `GET /api/firms`)

**Backend changes — Week 2:**
- New module: `src/modules/task-types/` (routes · controller · service · validation)
- New module: `src/modules/messages/` (routes · controller · service · validation)
- Update: `src/modules/firms/firms.service.ts` — add new fields to SELECT and INSERT/UPDATE
- Update: `src/modules/firms/firms.validation.ts` — add website_url, location, contact_role, contact_phone, account_manager_id validators
- Update: `src/modules/skills/skills.service.ts` — add color, description to SELECT and INSERT/UPDATE
- New endpoint: `POST /api/skills/:id` or `PATCH /api/skills/:id` — edit skill

---

### Week 3 — Project Management & Task Workflows

**Status:** Upcoming  
**Goal:** Projects CRUD, task status workflow, timesheet popover on tasks, firm-scoped views, My Tasks page

#### 3.1 Global Projects Page — `/projects`
- [ ] Status-grouped sections: To Do / Assigned / In Progress / Internal Review (with count badge)
- [ ] Project row: name + task type tag chips, client name, assignee avatar stack (+N overflow), due date, priority badge, status pill
- [ ] Row context menu: Edit, Delete (with confirm modal), Convert to Template (placeholder), Export (placeholder)
- [ ] Filter panel: Status checkboxes (colour pills) + Firm list with search
- [ ] Backend: extend `GET /api/projects` to support `?status=`, `?firm_id=`, pagination

#### 3.2 Project Search — Split Pane
- [ ] Left pane: collapsible firm → project → subtask tree
- [ ] `⌘K` shortcut handler (global)
- [ ] Right pane: project detail for selected item

#### 3.3 Create Project Modal
- [ ] Template dropdown (hardcode "No Template Required" for now)
- [ ] Fields: name (required), description, project type, start date, end date, assignees multi-picker, priority dropdown, file upload area
- [ ] Backend: extend `POST /api/projects` to accept start_date, end_date, priority, type, file attachments

#### 3.4 Project Detail Page — `/projects/:id`
- [ ] Header: name, "Created by [Name] on [date]", Actions dropdown
- [ ] Assignees multi-avatar, status pill, priority badge, due date
- [ ] Task type tags, timesheet entry row (hours logged + timer icon)
- [ ] Description block
- [ ] Attachments section: `POST /api/projects/:id/attachments` (upload to Supabase Storage)
- [ ] Sub Tasks list (display only for now — create form is a Figma gap)
- [ ] Activity Panel (slide-over): Recent / Files & Links / Notes tabs
  - `GET /api/projects/:id/messages` — message thread
  - `POST /api/projects/:id/messages` — post message
- [ ] Breadcrumb: Projects → [Firm Name] → [Project Name]

#### 3.5 Project Edit Slide-out
- [ ] Share project URL + Copy link button
- [ ] Name, description, status dropdown, team members list with Remove buttons, + Add member
- [ ] Backend: `PATCH /api/projects/:id` already exists — extend for team management

#### 3.6 Firm-Scoped Projects — FirmDetailPage Projects Tab
- [ ] Project View / Task View toggle
- [ ] Add Project button → opens Create Project Modal scoped to this firm
- [ ] Add Task button → Figma gap, show placeholder toast
- [ ] Client Tasks filter drawer: Date Range, Status, By Assignee, By Task Type
- [ ] Task View: flat task list grouped by status

#### 3.7 My Tasks Page — `/my-tasks`
- [ ] Left quick-filter sidebar: To do / Assigned to me / Today Due / Overdue / Active / In Progress / Urgent / Blocked / Revisions / Closed / Complete (with counts)
- [ ] Task rows with status group headers
- [ ] Row hover tooltip: Project name, Client, Assigned by
- [ ] Filter panel: Status checkboxes + Firm list with search
- [ ] Backend: `GET /api/tasks?assignee_id=me` filtered by current user

#### 3.8 Task Status Workflow
- [ ] Status pill click → inline dropdown on task cards (8 statuses)
- [ ] Valid transitions enforced (define in `constants.ts`):
  ```
  to_do → assigned, in_progress, blocked
  assigned → in_progress, blocked
  in_progress → revisions, internal_review, blocked
  revisions → in_progress
  internal_review → client_review, revisions
  client_review → completed, revisions
  completed → (terminal)
  blocked → to_do, in_progress
  ```
- [ ] `PATCH /api/tasks/:id/transition` — enforce valid transitions server-side

#### 3.9 Timesheet Popover on Task
- [ ] Time input: freeform text (e.g. "3h 20m") OR start/stop timer
- [ ] Date + time range picker
- [ ] Notes field + Billable toggle
- [ ] Save button → `POST /api/tasks/:id/time-logs`
- [ ] Time entries list below popover: per-user rows, hours, inline edit icon
- [ ] Inbox notification triggered for all assignees on status change

**Backend changes — Week 3:**
- New module: `src/modules/reports/` — placeholder stubs for Week 5
- New endpoints in messages module: `GET/POST /api/projects/:id/messages`
- New endpoints in projects module: `GET/POST/DELETE /api/projects/:id/attachments`
- Update: `src/modules/tasks/tasks.service.ts` — new status logic, transition validation
- Update: `src/modules/dashboard/dashboard.service.ts` — new status groups

---

### Week 4 — Inbox & Personal Timesheet

**Status:** Upcoming  
**Goal:** Full Inbox rebuild, My Timesheet weekly grid, global timer widget

#### 4.1 Inbox Feed — Full Rebuild (`/inbox`)
- [ ] Time-grouped sections: Today / Yesterday / Last 7 Days / [Month name]
- [ ] Two row types: project task rows (folder icon) + subtask rows (branch icon)
- [ ] @mention highlight in preview snippet
- [ ] Date label per row
- [ ] Mark all as read + Clear all header buttons
- [ ] Individual Clear button per row (hover)
- [ ] Filter button → opens Inbox Filter Drawer

#### 4.2 Inbox Activity Panel (slide-over)
- [ ] Opens on row click
- [ ] Task title header + project/firm breadcrumb
- [ ] Threaded messages: avatar, name, timestamp, body
- [ ] File attachment badges (e.g. Figma File)
- [ ] Status change activity items
- [ ] Assignment activity items
- [ ] Reaction row per message (thumbs up + smile)
- [ ] Reply button per message
- [ ] Text-only reply composer at panel bottom

#### 4.3 Inbox Filter Drawer
- [ ] Filter By checkboxes: Mentions / Replies / Unread / Assigned to me / Overdue / Cleared
- [ ] Clients section with search (`⌘K`)
- [ ] Client list
- [ ] Clear Filter + Apply footer buttons

#### 4.4 My Timesheet — Weekly Grid (`/timesheet`)
- [ ] Column headers: Tasks | Sun Mon Tue Wed Thu Fri Sat (date + daily hours target, e.g. 8h) | Total
- [ ] Task rows: task name + branch icon, per-day hour values, row total
- [ ] Clock icon per filled cell for quick time logging
- [ ] Week navigation: left/right arrows + date range label + chevron dropdown
- [ ] + Add task button
- [ ] Backend: `GET /api/timesheet/weekly?week=2026-04-21` — returns tasks with time_logs for the week
- [ ] Backend: `POST /api/timesheet/entry` — log hours for task on a specific date

#### 4.5 Global Header Timer Widget
- [ ] Start / Stop button in `Header.tsx` / `TopBar.tsx`
- [ ] Shows elapsed time while running
- [ ] On Stop: opens task assignment modal (Figma gap — placeholder toast for now)
- [ ] Backend: `POST /api/timers/start`, `PATCH /api/timers/stop`, `GET /api/timers/active`

**Backend changes — Week 4:**
- New module: `src/modules/timers/` — start/stop/active endpoints
- New module: `src/modules/timesheet/` — weekly grid query + entry creation
- Update: `src/modules/notifications/notifications.service.ts` — support Inbox format (scope, activity type)

---

### Week 5 — Time Reporting — By Team & By Client

**Status:** Upcoming  
**Goal:** Time Reports module with team view, client view, detail panels

#### 5.1 Time Reports Page — `/time-reports`

**By Team View:**
- [ ] By Team / By Client tab toggle
- [ ] Daily / Weekly / Monthly / Select dates filter tabs
- [ ] Team members table: avatar + name, Hours Spent, Allowed Hours, Hourly Rate
- [ ] Pagination (10/page)
- [ ] Row click → opens Team Member Time Detail Panel
- [ ] Backend: `GET /api/reports/by-team?period=weekly&date=2026-04-21`
  - Returns: `[{ user_id, name, avatar_url, role, hours_spent, allowed_hours, rate_amount, rate_frequency }]`

**Team Member Time Detail Panel:**
- [ ] Avatar + name + role badge
- [ ] Time filter (Daily / Weekly / Monthly / Select dates)
- [ ] Sort by Team + Sort by Status dropdowns
- [ ] Billable toggle
- [ ] Total Hours: spent / allowed (e.g. 38.50hrs / 40hrs)
- [ ] Hours allocation: expandable client rows → task-level breakdown with status badge
- [ ] Export timesheet button (Figma gap for format — implement CSV download)
- [ ] Backend: `GET /api/reports/by-team/:userId?period=weekly`

**By Client View:**
- [ ] Firms table: Company name, Accounts Manager (avatar + name), Primary Contact (avatar + name), Time Spent
- [ ] Section label: "These companies have purchased in the last 12 months"
- [ ] Row click → opens Client Time Detail Panel
- [ ] Backend: `GET /api/reports/by-client?period=weekly`

**Client Time Detail Panel:**
- [ ] Firm name header
- [ ] Date filter + Sort dropdowns + Billable toggle
- [ ] Total Hours summary
- [ ] Task breakdown: expandable rows with hours
- [ ] Export button
- [ ] Backend: `GET /api/reports/by-client/:firmId?period=weekly`

**Backend changes — Week 5:**
- Full implementation of `src/modules/reports/` module:
  - `GET /api/reports/by-team`
  - `GET /api/reports/by-team/:userId`
  - `GET /api/reports/by-client`
  - `GET /api/reports/by-client/:firmId`
- Queries aggregate `time_logs` joined with `tickets`, `firms`, `users`
- Exclude `log_type IN ('final', 'revision', 'transition')` from hour totals

---

### Week 6 — Team Pulse, Integration & QA

**Status:** Upcoming

#### 6.1 Team Pulse Page — `/team-pulse`
- [ ] 100-user table: avatar + name, Total Tasks (clickable count), Pulse availability badge
- [ ] Availability states:
  - **Available** (green): 0 tasks in `to_do`, `in_progress`, or `revisions`
  - **Available Soon** (amber): exactly 1 `in_progress` task
  - **Busy** (red): >1 active tasks (inferred — verify with client)
- [ ] Task count hover → popover: 8-status breakdown with counts
- [ ] Daily / Weekly / Monthly / Select dates filter
- [ ] Bulk select checkboxes
- [ ] Backend: `GET /api/team-pulse` — per-member task count grouped by status
  ```sql
  SELECT u.id, u.name, u.avatar_url, u.role,
    COUNT(*) FILTER (WHERE t.status = 'to_do') as to_do,
    COUNT(*) FILTER (WHERE t.status = 'assigned') as assigned,
    COUNT(*) FILTER (WHERE t.status = 'in_progress') as in_progress,
    COUNT(*) FILTER (WHERE t.status = 'revisions') as revisions,
    COUNT(*) FILTER (WHERE t.status = 'blocked') as blocked,
    COUNT(*) FILTER (WHERE t.status = 'internal_review') as internal_review,
    COUNT(*) FILTER (WHERE t.status = 'client_review') as client_review,
    COUNT(*) FILTER (WHERE t.status = 'completed') as completed
  FROM users u LEFT JOIN tickets t ON t.assignee_id = u.id
  GROUP BY u.id
  ```

#### 6.2 Cross-Feature Integration
- [ ] Task status change → Inbox notification for all assignees
- [ ] Dashboard task counts use new 8-status system
- [ ] Team Pulse availability refreshes on task update (polling or WebSocket — polling recommended for MVP)
- [ ] Time entries from timesheet popover appear in Time Reports
- [ ] New project appears in Dashboard Project Summary table + Firm Projects tab
- [ ] New user invite accepted → user available in all team pickers

#### 6.3 Polish & QA
- [ ] Empty states for all tables, panels, lists
- [ ] Loading skeleton screens on all data-fetch operations
- [ ] Error boundary + network failure states
- [ ] Permission-based UI: hide/disable elements based on role + extra permissions
  - `admin` + `super_admin`: full access
  - `project_manager`: can create/edit projects, cannot manage users/settings
  - `member`: task logging + personal timesheet only
- [ ] Responsive layout check across all screens
- [ ] Accessibility pass: keyboard navigation, focus rings, aria labels

---

## 6. New API Endpoints Required

### Immediate (Week 2)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/task-types` | member | List all task types |
| POST | `/api/task-types` | admin | Create task type |
| PATCH | `/api/task-types/:id` | admin | Edit task type (Figma gap — add anyway) |
| DELETE | `/api/task-types/:id` | admin | Delete task type |
| PATCH | `/api/skills/:id` | admin | Edit skill name/description/color (Figma gap) |
| POST | `/api/firms/:id/logo` | admin | Upload firm logo → Supabase Storage |
| GET | `/api/firms/:id/messages` | member | List firm communications thread |
| POST | `/api/firms/:id/messages` | member | Post message to firm thread |
| POST | `/api/firms/:id/messages/:msgId/react` | member | Add/remove emoji reaction |

### Week 3

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/projects/:id/messages` | member | Project activity thread |
| POST | `/api/projects/:id/messages` | member | Post to project thread |
| GET | `/api/projects/:id/attachments` | member | List project attachments |
| POST | `/api/projects/:id/attachments` | admin | Upload attachment → Supabase Storage |
| DELETE | `/api/projects/:id/attachments/:id` | admin | Delete attachment |
| PATCH | `/api/tasks/:id/transition` | member | Status transition (enforced) |
| GET | `/api/tasks` | member | Extend: `?assignee_id=me`, `?status=`, pagination |

### Week 4

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/timesheet/weekly` | member | Weekly grid data |
| POST | `/api/timesheet/entry` | member | Log hours for task on date |
| PATCH | `/api/timesheet/entry/:id` | member | Edit time entry |
| POST | `/api/timers/start` | member | Start global timer |
| PATCH | `/api/timers/stop` | member | Stop timer (optionally assign to task) |
| GET | `/api/timers/active` | member | Get running timer for current user |

### Week 5

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/reports/by-team` | admin | Team time report |
| GET | `/api/reports/by-team/:userId` | admin | Member time detail |
| GET | `/api/reports/by-client` | admin | Client time report |
| GET | `/api/reports/by-client/:firmId` | admin | Firm time detail |
| GET | `/api/reports/export` | admin | CSV export (Figma gap — implement anyway) |

### Week 6

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/team-pulse` | admin | Availability per member |

---

## 7. New Frontend Pages & Components

### New Pages

| Route | Component | Week | Notes |
|-------|-----------|------|-------|
| `/firms/new` | `AddFirmPage.tsx` | 2 | 3-step wizard — replaces simple form |
| `/projects` | `ProjectsPage.tsx` | 3 | Status-grouped list + filter panel |
| `/projects/:id` | `ProjectDetailPage.tsx` | 3 | Full detail view + activity panel |
| `/my-tasks` | `MyTasksPage.tsx` | 3 | Left sidebar filter + task rows |
| `/timesheet` | `TimesheetPage.tsx` | 4 | Weekly grid |
| `/time-reports` | `TimeReportsPage.tsx` | 5 | By Team / By Client |
| `/team-pulse` | `TeamPulsePage.tsx` | 6 | Availability table |

### New Components

| Component | Location | Week |
|-----------|----------|------|
| `FirmWizardStepper.tsx` | `components/firms/` | 2 |
| `FirmCommunicationsTab.tsx` | `components/firms/` | 2 |
| `MessageThread.tsx` | `components/shared/` | 2 |
| `MessageComposer.tsx` | `components/shared/` | 2 |
| `TaskTypeSlideOut.tsx` | `components/settings/` | 2 |
| `ProjectCard.tsx` | `components/projects/` | 3 |
| `ProjectDetailHeader.tsx` | `components/projects/` | 3 |
| `ActivityPanel.tsx` | `components/projects/` | 3 |
| `CreateProjectModal.tsx` | `components/projects/` | 3 |
| `ProjectEditSlideOut.tsx` | `components/projects/` | 3 |
| `TaskStatusDropdown.tsx` | `components/tasks/` | 3 |
| `TimesheetPopover.tsx` | `components/tasks/` | 3 |
| `InboxActivityPanel.tsx` | `components/inbox/` | 4 |
| `InboxFilterDrawer.tsx` | `components/inbox/` | 4 |
| `TimesheetWeeklyGrid.tsx` | `components/timesheet/` | 4 |
| `TimerWidget.tsx` | `components/layout/` | 4 |
| `TeamMemberDetailPanel.tsx` | `components/reports/` | 5 |
| `ClientDetailPanel.tsx` | `components/reports/` | 5 |
| `AvailabilityBadge.tsx` | `components/team-pulse/` | 6 |
| `TaskCountPopover.tsx` | `components/team-pulse/` | 6 |

### Updated Pages/Components

| File | Change | Week |
|------|--------|------|
| `pages/Dashboard.tsx` | New status colours + donut segments | 2 |
| `pages/FirmDetailPage.tsx` | Add tabs, communications, right sidebar | 2 |
| `pages/SettingsPage.tsx` | Org Details + Task Types tabs | 2 |
| `pages/InboxPage.tsx` | Full rebuild | 4 |
| `components/Sidebar.tsx` | Dynamic firm list from API | 2 |
| `components/layout/Header.tsx` | Timer widget | 4 |
| `components/tasks/TaskBadges.tsx` | New 8-status colour map | 2 |
| `lib/api.ts` | New API namespaces: taskTypesApi, messagesApi, timesheetApi, timersApi, reportsApi, teamPulseApi | 2–6 |
| `lib/constants.ts` | New status colours, VALID_TRANSITIONS for 8 statuses | 2 |

---

## 8. Dependency Build Order

The following must be done in sequence — each layer depends on the previous.

```
IMMEDIATE (before writing any Week 2 code)
├── Apply migration 028 on production DB
├── npm run build on production server → fixes invite 400 error
├── Apply migration 029 → new task statuses
├── Apply migration 030 → project_manager role in DB
├── Apply migration 031 → firms new fields
├── Apply migration 032 → projects new fields
├── Apply migration 033 → skills color/description
├── Apply migration 034 → task_types table
├── Update backend/src/config/constants.ts
│   └── VALID_STATUSES · VALID_TRANSITIONS · STATUS_PRIORITY · VALID_ROLES
├── Update frontend-new/src/lib/constants.ts
│   └── status colour map for 8 new statuses
├── Update frontend-new/src/lib/api.ts
│   └── Task.status type union · new API namespaces
└── Commit + push backend CORS fix (backend/src/index.ts is currently unstaged)

WEEK 2
├── task-types backend module
├── messages backend module
├── firms service/validation update
├── skills PATCH endpoint
├── Sidebar.tsx → dynamic firm list
├── SettingsPage → Org + Task Types tabs
└── AddFirmPage → 3-step wizard

WEEK 3 (requires Week 2 complete)
├── Migration 035 (messages)
├── Migration 036 (project_attachments)
├── projects module update (new fields + attachments)
├── tasks module update (new statuses + transition endpoint)
├── ProjectsPage · ProjectDetailPage · MyTasksPage
└── ActivityPanel · TimesheetPopover · TaskStatusDropdown

WEEK 4 (requires Week 3 complete)
├── Migration 037 (active_timers)
├── timers backend module
├── timesheet backend module
├── InboxPage full rebuild
├── TimesheetPage
└── TimerWidget in Header

WEEK 5 (requires Week 4 complete)
├── reports backend module
└── TimeReportsPage · detail panels

WEEK 6 (requires Week 5 complete)
├── team-pulse backend endpoint
├── TeamPulsePage
└── Cross-feature integration + QA pass
```

---

## 9. Missing Figma Designs — Development Blocked

The following features are referenced in the Figma designs (buttons/tabs exist) but **no screen has been designed**. No development begins on any of these until Figma is ready.

### Critical — Blocks Real Usage (13 items)

| Feature | Where it blocks |
|---------|----------------|
| Create Task form/modal | Add Task button exists everywhere — all task creation is blocked |
| Edit Task form | Task context menu Edit option — task editing is blocked |
| Skill edit form | Edit pencil on every skill card in Settings + User profile |
| Task Type edit form | Edit icon in Task Type Management table |
| Client Requests module | Firm page tab bar + global Projects nav |
| Notes module | Project Activity panel + Firm page Notes tab |
| Global timer stop → task assignment modal | Timer widget stop has no way to assign time |
| My Timesheet cell click-to-edit | Weekly grid cells are display-only |
| Sub-task creation form | Add Task in Project Detail sub-tasks section |
| File upload in chat composers | Attachments appear in chat but no upload button |
| Transcript Management module | Dashboard Quick Link "Manage Transcripts" goes nowhere |
| Export format + destination | Export buttons in Time Reports + Project context menu |
| Lead capture form | Marketing site banner |

### High — Needed for Production Quality (10 items)

| Feature | Impact |
|---------|--------|
| Inbox search | Cannot find specific messages/tasks |
| Inbox compose new thread | Can only reply, not start conversations |
| Dashboard donut chart drill-down | Segments are non-interactive |
| Focus Today panel clickable CTAs | Counts shown but no navigation |
| Task dependencies (blocked-by field) | Blocked status has no way to link blocker |
| Permission logic specification | No documented rule for role + extra permissions combinations |
| Timesheet approval workflow | Managers cannot approve/reject submitted timesheets |
| Organisation Info full details form | Only logo upload designed, no other org fields |
| Firm Notes + Time Reports tabs | Tabs in nav but no content designed |
| Attachment preview modal | Clicking PDF/MP4 has no viewer |

---

## 10. Immediate Action Checklist

Complete these **before writing any Week 2 feature code**:

- [ ] **Apply migration 028** on production Supabase SQL Editor
- [ ] **Run `npm run build`** in `backend/` on production server, restart process
- [ ] **Commit and push `backend/src/index.ts`** CORS fix (currently unstaged `M` in git status)
- [ ] **Apply migration 029** — new task statuses (run on production)
- [ ] **Apply migration 030** — `project_manager` in role CHECK (run on production)
- [ ] **Apply migration 031** — firms new fields
- [ ] **Apply migration 032** — projects new fields
- [ ] **Apply migration 033** — skills color/description
- [ ] **Apply migration 034** — task_types table
- [ ] **Update `backend/src/config/constants.ts`** — VALID_STATUSES, VALID_TRANSITIONS, STATUS_PRIORITY, add `project_manager` to VALID_ROLES docs
- [ ] **Update `backend/src/types/index.ts`** — TaskStatus type union, new permission keys
- [ ] **Update `frontend-new/src/lib/constants.ts`** — status colour map for 8 new statuses
- [ ] **Update `frontend-new/src/lib/api.ts`** — Task.status type, new permission key types
- [ ] **Rebuild local backend dist** — `cd backend && npm run build`
- [ ] **Test invite user on production** after above fixes to confirm 400 is resolved
