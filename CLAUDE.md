# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MarketingWiz is a transcript-to-ticket SaaS platform for marketing agencies. It ingests meeting transcripts from Fireflies.ai, uses GPT-4o-mini to generate actionable tickets per client firm, and provides a role-based portal for admins and team members to manage that work.

## Repository Structure

```
MarketingWiz/
├── frontend/               # React 18 + Vite SPA
│   └── src/
│       ├── pages/
│       │   ├── admin/      # Admin-only pages (9 pages)
│       │   └── member/     # Member-only pages (4 pages)
│       ├── components/     # Shared UI components + modals
│       ├── context/        # AuthContext.jsx
│       ├── hooks/          # usePagination.js
│       └── lib/            # api.js (single API client), permissions.js
├── backend/                # Express + TypeScript API (compiled to dist/)
│   └── src/
│       ├── controllers/    # Business logic (8 controllers)
│       ├── routes/         # Express routers (8 route files)
│       ├── middleware/      # auth.ts, rbac.ts
│       ├── services/       # ai.service.ts, fireflies.service.ts
│       ├── config/         # supabase.ts
│       └── types/          # index.ts — all enums and domain models
├── database/               # Supabase schema, RLS policies, seed data, migrations
│   ├── schema.sql          # Base schema (tables, RLS, indexes, triggers)
│   ├── views_and_indexes.sql  # Views + extra indexes (apply after schema.sql)
│   ├── seed.sql            # Dev seed: prompts and initial firms
│   ├── seed_demo.sql       # Full demo dataset
│   ├── seed_auth.js        # Node.js: bootstraps Supabase Auth users
│   └── migrations/         # Numbered migrations (001–017)
└── Docs/                   # Workflow spec and implementation guides
    ├── ticket-status-workflow.md
    ├── ticket-status-ui-guide.md
    ├── ticket-status-api.md
    └── ticket-generation-strategy.md
```

The frontend and backend are fully independent projects with their own `package.json` files. There is no root-level package.json.

## Commands

### Frontend
```bash
cd frontend
npm run dev       # Start Vite dev server on :5173
npm run build     # Production build
npm run lint      # ESLint (max-warnings 0)
```

### Backend
```bash
cd backend
npm run dev       # ts-node-dev with hot reload on :3000
npm run build     # tsc → compiles to dist/
npm start         # Run compiled dist/index.js
```

**Always run `npm run build` in `backend/` after editing TypeScript source files.** The server runs from `dist/`, not `src/`.

There are no automated tests.

## Architecture

### Authentication & RBAC

- JWT issued by Supabase Auth, stored in `localStorage` as `mw_token`
- Every API request sends `Authorization: Bearer <token>`
- Backend middleware chain: `authenticate` (verifies JWT via Supabase, attaches full user profile to `req.user`) → `requireAdmin` or `requireMember` (role check)
- `requireMember` allows both `admin` and `member` roles; `requireAdmin` is admin-only
- `requireSuperAdmin` allows only `super_admin` role (e.g. delete team member)
- `requirePermission(key)` checks `users.permissions` array for granular access
- Frontend `ProtectedRoute` in `App.jsx` enforces role-based redirects: admin → `/admin/dashboard`, member → `/member/dashboard`
- Auth state is managed by `AuthContext.jsx` and consumed via `useAuth()`
- `logout` is client-side only — the backend returns 200 immediately; JWT invalidation is the client's responsibility (delete `mw_token` from localStorage)

**Roles:** `member`, `admin`, `super_admin`
**Permissions array** (`users.permissions TEXT[]`): `manage_firms`, `manage_prompts`, `manage_team`, and others defined in `src/types/index.ts`. The `requirePermission()` middleware checks this column.

### Backend Structure

Route → Controller → Supabase (direct queries, no ORM)

- All routes mount under `/api` via `src/routes/index.ts`
- `src/config/supabase.ts` uses the **service-role key** (bypasses RLS — backend is fully trusted)
- `src/types/index.ts` defines all enums and domain models; import from here rather than re-defining types
- Services in `src/services/` encapsulate third-party integrations:
  - `ai.service.ts` — OpenAI GPT-4o-mini for ticket generation; falls back to mock data if `OPENAI_API_KEY` is absent
  - `fireflies.service.ts` — GraphQL sync from Fireflies API; falls back to mock data if `FIREFLIES_API_KEY` is absent

### API Endpoints Reference

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/auth/login` | public | Supabase Auth login |
| POST | `/api/auth/logout` | member | Client-side logout |
| GET | `/api/auth/me` | member | Current user profile |
| PATCH | `/api/auth/profile` | member | Update own profile |
| GET | `/api/dashboard/admin` | admin | Admin stats (ticket counts, recent activity) |
| GET | `/api/dashboard/team-workload` | admin | Team workload via `v_team_workload` view |
| GET | `/api/dashboard/overdue-tickets` | admin | Tickets past deadline or approved 7+ days |
| GET | `/api/dashboard/member` | member | Member stats (assigned, pending, hours) |
| GET | `/api/tickets` | member | List tickets (admin: all; member: own only) |
| POST | `/api/tickets` | admin | Create manual ticket |
| GET | `/api/tickets/:id` | member | Single ticket detail |
| PATCH | `/api/tickets/:id` | member | Update ticket (admin: full; member: estimated_hours only) |
| PATCH | `/api/tickets/:id/assign-approve` | admin | Assign assignee + approve draft |
| PATCH | `/api/tickets/:id/discard` | admin | Discard a draft ticket |
| POST | `/api/tickets/:id/regenerate` | admin | AI regenerate ticket content |
| PATCH | `/api/tickets/:id/resolve` | member | Mark ticket resolved (member: own; admin: any) |
| DELETE | `/api/tickets/:id` | admin | Delete discarded ticket |
| PATCH | `/api/tickets/:id/archive` | admin | Archive/unarchive ticket |
| PATCH | `/api/tickets/:id/transition` | admin | Transition ticket to any valid status |
| GET | `/api/tickets/:id/time-logs` | member | List time logs for ticket |
| POST | `/api/tickets/:id/time-logs` | member | Add time log entry |
| PATCH | `/api/tickets/:id/time-logs/:logId` | member | Edit own time log |
| DELETE | `/api/tickets/:id/time-logs/:logId` | member | Delete own time log |
| GET | `/api/firms` | member | List firms |
| POST | `/api/firms` | admin | Create firm |
| GET | `/api/firms/:id` | member | Firm detail with ticket stats |
| PATCH | `/api/firms/:id` | admin | Update firm |
| DELETE | `/api/firms/:id` | admin | Delete firm |
| GET | `/api/team` | admin | List team members |
| POST | `/api/team` | admin | Create team member (Supabase Auth + profile) |
| GET | `/api/team/:id` | admin | Member detail |
| PATCH | `/api/team/:id` | admin | Update member |
| DELETE | `/api/team/:id` | super_admin | Delete member |
| GET | `/api/transcripts` | admin | List transcripts |
| POST | `/api/transcripts` | admin | Create manual transcript |
| POST | `/api/transcripts/sync` | admin | Trigger Fireflies sync |
| PATCH | `/api/transcripts/:id/archive` | admin | Archive/unarchive transcript |
| POST | `/api/transcripts/:id/process` | admin | Generate tickets from transcript |
| GET | `/api/prompts` | admin | List prompt templates |
| POST | `/api/prompts` | admin | Create prompt template |
| PATCH | `/api/prompts/:id` | admin | Update prompt template |
| GET | `/api/notifications` | member | List notifications |
| GET | `/api/notifications/unread-count` | member | Unread notification count |
| PATCH | `/api/notifications/:id/read` | member | Mark notification read |
| PATCH | `/api/notifications/read-all` | member | Mark all notifications read |

### Frontend Pages Reference

| File | URL | Role | Purpose |
|------|-----|------|---------|
| `pages/Login.jsx` | `/login` | public | Login form |
| `pages/admin/Dashboard.jsx` | `/admin/dashboard` | admin | Stats, overdue tickets, team workload panel |
| `pages/admin/TicketList.jsx` | `/admin/tickets` | admin | All tickets with URL-param filters |
| `pages/admin/TicketDetail.jsx` | `/admin/tickets/:id` | admin | Ticket edit, assign, approve, regenerate, transition |
| `pages/admin/TranscriptsList.jsx` | `/admin/transcripts` | admin | Fireflies sync, process transcripts → tickets |
| `pages/admin/FirmsList.jsx` | `/admin/firms` | admin | Client firms with ticket stats |
| `pages/admin/FirmDetail.jsx` | `/admin/firms/:id` | admin | Firm tickets, clickable stat badges |
| `pages/admin/AddFirm.jsx` | `/admin/firms/new` | admin | Create firm |
| `pages/admin/TeamList.jsx` | `/admin/team` | admin | Team roster |
| `pages/admin/AddMember.jsx` | `/admin/team/new` | admin | Create team member |
| `pages/admin/MemberDetail.jsx` | `/admin/team/:id` | admin | Member workload view |
| `pages/admin/MemberEdit.jsx` | `/admin/team/:id/edit` | admin | Edit member permissions |
| `pages/admin/Profile.jsx` | `/admin/profile` | admin | Admin account settings |
| `pages/member/Dashboard.jsx` | `/member/dashboard` | member | Assigned tickets overview |
| `pages/member/TicketList.jsx` | `/member/tickets` | member | Own tickets grouped by status |
| `pages/member/TicketDetail.jsx` | `/member/tickets/:id` | member | Log time, view revision history, resolve |
| `pages/member/Profile.jsx` | `/member/profile` | member | Member account settings |

### Frontend Structure Notes

- `src/lib/api.js` is the **single API client** — all pages import from here. Add new endpoints here, never use `fetch` directly in components.
- `src/lib/api.js` also exports shared formatters and helpers:
  - `formatDate(iso)` — `"Oct 24, 2023"`
  - `formatDuration(seconds)` — `"1h 12m"`
  - `timeAgo(iso)` — `"2 hours ago"`
  - `formatHours(h)` — `"1h 30m"` from decimal
  - `decimalToHoursMinutes(decimal)` — `{ hrs, mins }`
  - `hoursMinutesToDecimal(hrs, mins)` — decimal float
  - `getStatusBadge(status)` — Tailwind class string for single badge
  - `getStatusBadges(ticket, spentHours?)` — array of `{ label, style }` for status display
  - `VALID_TRANSITIONS` — maps each status to allowed next statuses
- Pages are split by role under `src/pages/admin/` and `src/pages/member/`
- Shared UI: `Sidebar.jsx`, `TopNav.jsx`, `NotificationBell.jsx`, `Toast.jsx`, `Pagination.jsx`
- Modals: `CreateTicketModal`, `EditTicketModal`, `AssignApproveModal`, `ResolveTicketModal`, `RegenerateTicketModal`, `TicketConfirmationModal`
- Demo credentials block in `Login.jsx` is wrapped in `import.meta.env.DEV` — stripped from production builds

### Database (Supabase / PostgreSQL)

**Tables (8 total):**

| Table | Key Columns | Notes |
|-------|-------------|-------|
| `users` | id, name, email, role, permissions TEXT[] | role: member/admin/super_admin |
| `firms` | id, name, description | Client firms (unique name) |
| `prompts` | id, name, type, content | AI prompt templates |
| `transcripts` | id, title, raw_transcript, source, archived, fetched_at | fetched_at = NULL means manual |
| `processing_sessions` | id, transcript_id, firm_id, prompt_id, created_by | Links transcript → tickets batch |
| `tickets` | id, session_id, firm_id, assignee_id, title, description, type, priority, status, change_note, estimated_hours, ai_generated, edited, archived, deadline, regeneration_count, last_regenerated_at, revision_count | Core work item |
| `time_logs` | id, ticket_id, user_id, hours, comment, log_type, revision_cycle, created_at, updated_at | log_type: estimate/partial/final/revision |
| `notifications` | id, user_id, ticket_id, type, message, read, created_at | Member alerts |

**Views (3 total):**

| View | Source | Purpose |
|------|--------|---------|
| `v_tickets_full` | `011_update_v_tickets_full.sql` | Tickets with firm name, assignee info, aggregated time; includes deadline, regeneration_count, last_regenerated_at |
| `v_firm_ticket_stats` | `views_and_indexes.sql` + `004_add_last_ticket_at.sql` | Per-firm ticket counts and last_ticket_at |
| `v_team_workload` | `017_fix_v_team_workload.sql` | Per-member active/resolved ticket counts and hours (excludes final/revision log types from hours total) |

**RLS Policies:**
- RLS enabled on all tables
- Backend uses **service-role key** → bypasses RLS entirely
- Frontend never calls Supabase directly (all through backend API)
- Policies exist for potential future direct-client use cases

**Schema Application Order:**
1. `schema.sql` — base tables, RLS, indexes, triggers
2. `views_and_indexes.sql` — views and additional indexes
3. Migrations 001–017 in order (see list below)

Migrations must be applied via **Supabase SQL Editor**. Do NOT wrap in `BEGIN`/`COMMIT` — Supabase SQL Editor rejects explicit transaction blocks.

### Migrations Applied (001–017)

| # | File | What it does |
|---|------|--------------|
| 001 | `001_schema_fixes.sql` | Fix v_team_workload cross-join, add indexes, enforce NOT NULL, add firms.name UNIQUE, add users.updated_at. **Uses BEGIN/COMMIT — do NOT re-run; extract individual statements if needed** |
| 002 | `002_manual_tickets.sql` | Add CHECK constraint for session_id vs ai_generated invariant |
| 003 | `003_ticket_delete.sql` | Add partial index for discarded ticket queries |
| 004 | `004_add_last_ticket_at.sql` | Add last_ticket_at to v_firm_ticket_stats |
| 005 | `005_add_deadline.sql` | Add `tickets.deadline DATE` nullable column |
| 006 | `006_optimize_transcript_tickets.sql` | Add `transcripts.fetched_at`, `tickets.regeneration_count`, `tickets.last_regenerated_at`; add FK indexes |
| 006b | `006_notifications.sql` | Create `notifications` table with RLS |
| 007 | `007_add_permissions.sql` | Add `users.permissions TEXT[]` column |
| 008 | `008_add_super_admin_role.sql` | Extend role CHECK to include `super_admin` |
| 009 | `009_super_admin_rls.sql` | `current_user_role()` returns `admin` for both `admin` and `super_admin` — all RLS policies apply to super_admin |
| 010 | `010_fix_notifications_rls.sql` | Enable RLS on notifications, add SELECT/INSERT/UPDATE policies |
| 011 | `011_update_v_tickets_full.sql` | Add deadline, regeneration_count, last_regenerated_at to v_tickets_full |
| 012 | `012_estimated_hours_convention.sql` | Documents DECIMAL(5,2) convention for fractional hours |
| 013 | `013_time_logs_updated_at.sql` | Add `time_logs.updated_at` with auto-update trigger |
| 014 | `014_add_archived_to_tickets.sql` | Add `tickets.archived BOOLEAN` with partial index |
| 015 | `015_expand_ticket_status.sql` | Expand status from 4-value to 10-value workflow; rename existing `approved` → `in_progress` rows |
| 016 | `016_revision_tracking.sql` | Add `time_logs.revision_cycle INTEGER`, `tickets.revision_count INTEGER`; expand log_type CHECK to include `revision` |
| 017 | `017_fix_v_team_workload.sql` | Recreate v_team_workload with correct `in_progress`/`revisions` active filter and exclude final/revision logs from hours |

### Key Flows

**Transcript → Ticket pipeline:**
1. Fireflies sync runs automatically every 15 minutes via `node-cron` in `src/index.ts` (also fires once on startup). Manual trigger: `POST /api/transcripts/sync`. Transcripts are upserted to the `transcripts` table with `fetched_at = NOW()`.
2. Admin selects a transcript + firm + prompt type and calls `POST /api/transcripts/:id/process`
3. `ai.service.ts` generates `TicketDraft[]` from the transcript text and prompt
4. Tickets are inserted with `status = draft` and linked to the `processing_session`
5. Admin redirected to Firm Detail page — newly created tickets show an orange **"New"** badge (visible for 15 min) and a "Created X ago" timestamp
6. Admin reviews drafts on the Firm Detail page, then assigns + approves, regenerates, or discards

**Full Ticket Lifecycle (10 statuses):**

```
draft → in_progress → resolved → internal_review → client_review → compliance_review → approved → closed
                  ↘ discarded      ↑                    ↑                  ↑
                                revisions ←─────────────┴──────────────────┘
```

Valid transitions (enforced by `VALID_TRANSITIONS` in `api.js` and `transitionTicket` controller):
- `draft` → `in_progress`, `discarded`
- `in_progress` → `resolved`, `discarded`
- `resolved` → `internal_review`
- `internal_review` → `client_review`, `revisions`
- `client_review` → `compliance_review`, `revisions`
- `compliance_review` → `approved`, `revisions`
- `approved` → `closed`
- `revisions` → `internal_review`
- `closed` / `discarded` → (terminal)

**Sending to revisions (admin `PATCH /api/tickets/:id/transition` with `status: 'revisions'`):**
1. `tickets.revision_count` incremented by 1
2. A `revision` type log is inserted to `time_logs` with `hours=0`, `comment=change_note`, `revision_cycle=newCycle`
3. This log acts as the section divider in the member's Time History card
4. The member sees an orange "Changes Requested" banner with the admin's note

**Regenerating tickets:**
- Admin regenerates a draft ticket — backend reads `raw_transcript` from DB (via `session_id → processing_sessions → transcript_id`) and calls AI; no Fireflies API call
- Existing ticket updated in place: new `title`, `description`, `type`, `priority`; `edited = true`, `regeneration_count++`, `last_regenerated_at = NOW()`

**Resolving tickets:**
- Members resolve via `PATCH /api/tickets/:id/resolve` — only if assigned and `status IN ('in_progress', 'revisions')`
- A `final` type time log is inserted as a resolution snapshot
- Admins can resolve any approved ticket (ownership check bypassed for admin role)

### Time Log System

`time_logs.log_type` values:

| log_type | Description | Counted in totals? |
|----------|-------------|-------------------|
| `partial` | Regular work session log by member | Yes |
| `estimate` | Time estimate entry | Yes |
| `final` | Resolution snapshot (created on resolve) — mirrors partial totals | No (excluded to avoid double-count) |
| `revision` | Zero-hour milestone marker (created when admin sends to revisions) — acts as section divider | No (hours = 0) |

`time_logs.revision_cycle`:
- `0` = initial work before any revision
- `1`, `2`, ... = logs added during that revision cycle
- Set from `tickets.revision_count` at insert time

**Member Time History UI** (`member/TicketDetail.jsx`) groups logs into cycle cards:
- Cycle 0 → "INITIAL WORK" header card
- Cycle N → orange admin note banner + "REVISION N LOGS" header card
- Edit/delete buttons hidden once ticket is `resolved`, `closed`, `discarded`, or any review/approved status

### Work Status Display (derived — no DB column)

The `getStatusBadges(ticket, spentHours?)` function in `api.js` maps ticket state to display labels. Pass `spentHours` explicitly on detail pages where it's computed from filtered logs (not from `ticket.time_spent` which may be stale).

| `ticket.status` | `time_spent` | Badge shown |
|---|---|---|
| `draft` | any | "New" |
| `in_progress` | 0 | "Approved" + "New" |
| `in_progress` | > 0 | "In Progress" (blue) |
| `resolved` | any | "Resolved" |
| `internal_review` | any | "Internal Review" (violet) |
| `client_review` | any | "Client Review" (indigo) |
| `compliance_review` | any | "Compliance Review" (amber) |
| `approved` | any | "Approved" (emerald) |
| `closed` | any | "Closed" |
| `revisions` | any | "Revisions" (orange) |
| `discarded` | any | "Discarded" (red) |

### Admin Ticket Filtering via URL Params

`/admin/tickets` reads URL search params on mount to pre-populate filters:
- `?firm_id=X` — pre-filters by firm
- `?status=<value>` — pre-filters by status (any of the 10 values)
- `?assignee_id=X` — pre-filters by assignee

Stat badges on the Firm Detail page (`/admin/firms/:id`) are clickable and navigate to the ticket list with these params pre-set.

### Dashboard — Team Workload

`GET /api/dashboard/team-workload` is backed by `v_team_workload` view (defined in migration 017). Each member row shows:
- `active_tickets` — tickets with `status IN ('in_progress', 'revisions')`
- `resolved_tickets` — tickets with `status = 'resolved'`
- `total_assigned` — all tickets assigned to member
- `total_hours_logged` — sum of hours excluding `final` and `revision` log types
- Progress bar color: green ≤3 active, amber 4–6, red >6

### Notifications

Notifications are created server-side (e.g. when a ticket is assigned or sent back for revisions). Members poll `GET /api/notifications/unread-count` via `NotificationBell.jsx`. Marking read: `PATCH /api/notifications/:id/read` or `PATCH /api/notifications/read-all`.

## Environment Variables

Copy `backend/.env.example` to `backend/.env`:

| Variable | Required | Purpose |
|---|---|---|
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Service role key (bypasses RLS) |
| `SUPABASE_ANON_KEY` | Yes | Anon key (used for auth token verification) |
| `OPENAI_API_KEY` | No | GPT-4o-mini; mock fallback if absent |
| `FIREFLIES_API_KEY` | No | Fireflies GraphQL; mock fallback if absent |
| `FRONTEND_URL` | No | CORS origin (default: `http://localhost:5173`) |
| `PORT` | No | Server port (default: `3000`) |
| `SUPER_ADMIN_EMAIL` | No | Seed super_admin user email on startup |
| `SUPER_ADMIN_PASSWORD` | No | Seed super_admin user password on startup |

Frontend uses `frontend/.env` with `VITE_API_URL` (default: `http://localhost:3000/api`).

**Security:** `backend/.env` and all `.env` files are gitignored. Never commit credentials. If credentials were previously committed, rotate them immediately in the Supabase dashboard.

## Design System

The UI uses a "Kinetic Editorial" design language:
- Primary accent: orange `#C84B0E` (`text-primary-container`, `bg-primary-container`)
- Dark sidebar: `#111111`
- Tailwind CSS with PostCSS (no CDN — fully compiled)
- No borders/lines philosophy — separation via spacing and background color contrast
- Badge sizing: `text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded`
- Work Status badges use `rounded-sm tracking-tighter` (slightly tighter than status badges)
- Surface layers (light → dark): `surface` → `surface-container-lowest` → `surface-container-low` → `surface-container` → `surface-container-high` → `surface-container-highest`

## Known Constraints

- `users` table `updated_at` column may return `null` depending on DB triggers — treat as nullable throughout
- Time log insert on admin-resolved tickets records `user_id` as the admin's ID, not the assignee's. Known data accuracy limitation.
- The "New" badge on Firm Detail ticket cards uses a 15-minute client-side threshold (`Date.now()`). Not persisted — disappears on page refresh after 15 min.
- `import` statements must always appear at the top of a file before any executable code — ES module rule enforced by Vite. Placing an import after a `const` declaration silently breaks the module.
- Migration `001_schema_fixes.sql` uses `BEGIN`/`COMMIT` blocks and cannot be re-run via Supabase SQL Editor. Extract individual statements if any need to be re-applied.
- `ticket.time_spent` in list API responses is backend-computed from time_logs. On detail pages, compute from the `timeLogs` state directly (filtered to exclude `final` and `revision`) and pass as `spentHours` to `getStatusBadges()` — otherwise the badge won't update after new logs are added without a full page reload.
- Resolved tickets lock the time-logging UI (`!(isClosed || isResolved)` gate in `member/TicketDetail.jsx`). The backend also enforces this — `createTimeLog` only accepts `status IN ('in_progress', 'revisions')`.
- Existing tickets that were sent back for revisions **before migration 016 was applied** will not have a `revision` type log divider. Their full history shows under "Initial Work". To fix a specific ticket, manually insert a `revision` log with `hours=0`, `revision_cycle=1`, `comment=<admin note>` and `UPDATE tickets SET revision_count=1 WHERE id=...`.
