# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MarketingWiz is a transcript-to-ticket SaaS platform for marketing agencies. It ingests meeting transcripts from Fireflies.ai, uses GPT-4o-mini to generate actionable tickets per client firm, and provides a role-based portal for admins and team members to manage that work.

## Repository Structure

```
MarketingWiz/
├── frontend/               # React 18 + Vite SPA (legacy — original admin/member portal)
│   └── src/
│       ├── pages/
│       │   ├── admin/      # Admin-only pages (9 pages)
│       │   └── member/     # Member-only pages (4 pages)
│       ├── components/     # Shared UI components + modals
│       ├── context/        # AuthContext.jsx
│       ├── hooks/          # usePagination.js
│       └── lib/            # api.js (single API client), permissions.js
├── frontend-new/           # React 19 + TypeScript + Vite SPA (active development)
│   └── src/
│       ├── pages/          # auth/, onboarding/, Dashboard.tsx, UsersPage.tsx, AddUserPage.tsx
│       ├── components/
│       │   ├── ui/         # Button, Input, Avatar, Badge, Toast, MultiSelect, PhoneInput, etc.
│       │   ├── layout/     # AuthLayout
│       │   ├── dashboard/  # MetricCard, QuickLinks, TasksTable
│       │   ├── onboarding/ # OnboardingStepper, StepIcon
│       │   └── users/      # EditUserDrawer, SkillBadge, StatusBadge
│       ├── context/        # AuthContext.tsx
│       ├── hooks/          # useClickOutside.ts
│       ├── lib/            # api.ts (typed API client)
│       └── types/          # index.ts — domain types
├── backend/                # Express + TypeScript API (compiled to dist/)
│   └── src/
│       ├── controllers/    # Business logic controllers
│       ├── modules/        # Feature modules (users, skills, member-roles) — each has routes/controller/service/dto
│       ├── routes/         # Express routers
│       ├── middleware/     # auth.ts, rbac.ts
│       ├── services/       # ai, fireflies, email, invite, etc.
│       ├── config/         # supabase.ts
│       └── types/          # index.ts — all enums and domain models
├── database/               # Supabase schema, RLS policies, seed data, migrations
│   ├── schema.sql          # Base schema (tables, RLS, indexes, triggers)
│   ├── views_and_indexes.sql  # Views + extra indexes (apply after schema.sql)
│   ├── seed.sql            # Dev seed: prompts and initial firms
│   ├── seed_demo.sql       # Full demo dataset
│   ├── seed_auth.js        # Node.js: bootstraps Supabase Auth users
│   └── migrations/         # Numbered migrations (001–024)
└── Docs/                   # Workflow spec and implementation guides
    ├── ticket-status-workflow.md
    ├── ticket-status-ui-guide.md
    ├── ticket-status-api.md
    └── ticket-generation-strategy.md
```

Both frontend/ and frontend-new/ are independent from backend. There is no root-level package.json.

## Commands

### Frontend (legacy)
```bash
cd frontend
npm run dev       # Start Vite dev server on :5173
npm run build     # Production build
npm run lint      # ESLint (max-warnings 0)
```

### Frontend-new (active)
```bash
cd frontend-new
npm run dev       # Start Vite dev server on :5173
npm run build     # Production build
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
- **frontend-new:** Auth state managed by `AuthContext.tsx`, consumed via `useAuth()`. `ProtectedRoute` redirects unauthenticated → `/login`. `GuestRoute` redirects authenticated away from auth pages → `/dashboard`. `/onboarding` is fully public.
- **frontend (legacy):** `ProtectedRoute` in `App.jsx` enforces role-based redirects: admin → `/admin/dashboard`, member → `/member/dashboard`
- `logout` is client-side only — the backend returns 200 immediately; JWT invalidation is the client's responsibility (delete `mw_token` from localStorage)

**Roles:** `member`, `admin`, `super_admin`
**Permissions array** (`users.permissions TEXT[]`): `manage_firms`, `manage_prompts`, `manage_team`, and others defined in `src/types/index.ts`. The `requirePermission()` middleware checks this column.

### Backend Structure

Route → Controller → Supabase (direct queries, no ORM)

- All routes mount under `/api` via `src/routes/index.ts`
- `src/config/supabase.ts` uses the **service-role key** (bypasses RLS — backend is fully trusted)
- `src/types/index.ts` defines all enums and domain models; import from here rather than re-defining types
- **Module-based architecture** for newer features: `src/modules/<name>/` contains `<name>.routes.ts`, `<name>.controller.ts`, `<name>.service.ts`, `dto/`
- Services in `src/services/` encapsulate third-party integrations:
  - `ai.service.ts` — OpenAI GPT-4o-mini for ticket generation; falls back to mock data if `OPENAI_API_KEY` is absent
  - `fireflies.service.ts` — GraphQL sync from Fireflies API; falls back to mock data if `FIREFLIES_API_KEY` is absent
  - `invite.service.ts` — `generateInviteToken(userId, email)`, `verifyInviteToken(token)` — HMAC-SHA256 signed, 24-hour expiry
  - `email.service.ts` — `sendInviteEmail()`, `sendProfileUpdateEmail()` — falls back to console log if SMTP not configured

### API Endpoints Reference

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/auth/login` | public | Supabase Auth login |
| POST | `/api/auth/logout` | member | Client-side logout |
| GET | `/api/auth/me` | member | Current user profile |
| PATCH | `/api/auth/profile` | member | Update own profile |
| GET | `/api/auth/onboarding/validate?token=` | public | Validate invite token, return email+name |
| POST | `/api/auth/onboarding/complete` | public | Set password + profile fields, activate account, return JWT |
| POST | `/api/auth/onboarding/avatar` | public | Upload base64 avatar to Supabase Storage (falls back to data URL in local dev) |
| GET | `/api/users` | admin | List all users with skills |
| POST | `/api/users` | admin | Create user (Supabase Auth + profile), send invite email if status='invited' |
| GET | `/api/users/:id` | admin | Single user with skills |
| PATCH | `/api/users/:id` | admin | Update user profile + skill set, send change notification email |
| DELETE | `/api/users/:id` | admin | Delete user (profile + auth) — cannot self-delete |
| GET | `/api/skills` | member | List all skills |
| POST | `/api/skills` | admin | Create skill |
| DELETE | `/api/skills/:id` | admin | Delete skill (cascades user_skills) |
| GET | `/api/member-roles` | member | List all member roles |
| POST | `/api/member-roles` | admin | Create member role |
| DELETE | `/api/member-roles/:id` | admin | Delete member role |
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

---

## Frontend-New Reference (Active Development)

### Pages

| File | URL | Auth | Purpose |
|------|-----|------|---------|
| `pages/auth/Login.tsx` | `/login` | guest-only | Login form |
| `pages/auth/ForgotPassword.tsx` | `/forgot-password` | guest-only | Password reset request |
| `pages/auth/ResetLinkSent.tsx` | `/reset-link-sent` | guest-only | Reset email sent confirmation |
| `pages/auth/EmailPreview.tsx` | `/email-preview` | guest-only | Email template preview |
| `pages/onboarding/OnboardingPage.tsx` | `/onboarding?token=` | public | 3-step invite flow: password → personal details → avatar |
| `pages/Dashboard.tsx` | `/dashboard` | protected | Metric cards, quick links, tasks table. Time filters (all/custom/30d/7d/24h) and subtabs (tasks/timesheets/transcripts) |
| `pages/UsersPage.tsx` | `/users` | protected | Paginated team member list (10/page). Name, status badge, role/title, email, skills. Edit + delete. |
| `pages/AddUserPage.tsx` | `/users/new` | protected | Invite form: name, email, password, system role, member_role (picker + inline-add), skills (multi-select + inline-add), status='invited' |

### Route Structure (App.tsx)

- `<GuestRoute>` wraps `/login`, `/forgot-password`, `/reset-link-sent`, `/email-preview` — redirects authenticated users → `/dashboard`
- `<ProtectedRoute>` wraps `/dashboard`, `/users`, `/users/new` — redirects unauthenticated → `/login`
- `/onboarding` is **fully public** — no auth layer
- `<AppShell>` wraps all protected routes and renders `<Sidebar>` + `<TopBar>`

### UI Components (frontend-new/src/components/)

**ui/**
| Component | Purpose |
|-----------|---------|
| `Avatar.tsx` | Initials-based avatar with optional image; sizes: xs/sm/md/lg |
| `AvatarStack.tsx` | Overlapping stack of avatars |
| `Badge.tsx` | Generic badge with color variants |
| `Button.tsx` | Primary/secondary/ghost variants; sm/md/lg sizes; `loading` prop; left/right icon slots |
| `Checkbox.tsx` | Styled checkbox |
| `FileUpload.tsx` | Drag-and-drop zone; click-to-browse; max file size validation; shows upload icon + hints |
| `ImageCropModal.tsx` | `react-image-crop` 1:1 square crop; 8 gradient swatches; outputs 400×400 JPEG data URL |
| `Input.tsx` | Label, placeholder, error state, `rightIcon` slot, required asterisk |
| `MultiSelect.tsx` | Searchable multi-select dropdown; column layout; optional inline "add new" |
| `PhoneInput.tsx` | Country code picker (flag + ISO code, 10 countries) + phone number input; error state |
| `SlideOver.tsx` | Right-side slide-over drawer |
| `Toast.tsx` | Bottom-right toast notification |

**layout/** — `AuthLayout.tsx` wraps auth pages

**dashboard/** — `MetricCard.tsx`, `QuickLinks.tsx`, `TasksTable.tsx`

**onboarding/** — `OnboardingStepper.tsx` (step progress), `StepIcon.tsx` (per-step icon)

**users/** — `EditUserDrawer.tsx` (slide-over edit form), `SkillBadge.tsx`, `StatusBadge.tsx`

**Top-level** — `Sidebar.tsx`, `TopBar.tsx`, `Header.tsx`, `Logo.tsx`, `AccountCard.tsx`, `DateRangePicker.tsx`

**Sidebar sub-components** — `NavItem.tsx`, `NavSection.tsx`, `ExpandableNavItem.tsx`, `SidebarBadge.tsx`

### API Client (frontend-new/src/lib/api.ts)

Single `request<T>(method, path, body?)` function — reads `mw_token` from localStorage, sends `Authorization: Bearer`. Never use `fetch()` directly in components.

**Exported namespaces:**

```ts
authApi.login(email, password)        // POST /auth/login → { user: AuthUser, token }
authApi.me()                          // GET /auth/me → AuthUser

usersApi.list()                       // GET /users → User[]
usersApi.get(id)                      // GET /users/:id → User
usersApi.create(payload)              // POST /users → User
usersApi.update(id, payload)          // PATCH /users/:id → User
usersApi.delete(id)                   // DELETE /users/:id

skillsApi.list()                      // GET /skills → Skill[]
skillsApi.create({ name, category? }) // POST /skills → Skill
skillsApi.delete(id)                  // DELETE /skills/:id

memberRolesApi.list()                 // GET /member-roles → MemberRole[]
memberRolesApi.create(name)           // POST /member-roles → MemberRole
memberRolesApi.delete(id)             // DELETE /member-roles/:id

onboardingApi.validate(token)         // GET /auth/onboarding/validate?token=…
onboardingApi.uploadAvatar(token, image) // POST /auth/onboarding/avatar
onboardingApi.complete({ token, first_name, last_name, phone_number?, avatar_url?, password })
```

**Key interfaces:**

```ts
AuthUser { id, name, email, role: 'admin'|'member'|'super_admin', permissions[] }

User {
  id, name, first_name, last_name, phone_number, avatar_url,
  email, role, member_role, status: 'Active'|'invited'|'Disabled',
  permissions[], skills: Skill[], created_at, updated_at
}

Skill { id, name, category: string|null, created_at }
MemberRole { id, name, created_at }
```

### Context & Hooks

- `context/AuthContext.tsx` — `AuthProvider` + `useAuth()` hook. Manages `user: AuthUser | null`, `initialising: boolean`. Exposes `login()` and `logout()`. Token stored as `mw_token` in localStorage.
- `hooks/useClickOutside.ts` — fires handler on mousedown outside a given ref element

### Design System (frontend-new)

- Primary brand: `brand-600: #7F56D9` (button base), `brand-700: #6941C6` (hover)
- Error: `error-500`, `error-600` (Tailwind custom tokens)
- Gray scale: `gray-50` through `gray-900` (standard Tailwind)
- Input/label text: `#414651` (label), `#535862` (placeholder/sublabel)
- Icons: `@untitled-ui/icons-react` — icon names use numbered variants (e.g. `UploadCloud01`, not `UploadCloud`)
- Untitled UI icon package exports `UploadCloud01`, `UploadCloud02` etc — always check the exact export name before using

---

## Frontend (Legacy) Reference

### Pages

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

### Frontend (Legacy) Structure Notes

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
- Shared UI: `Sidebar.jsx`, `TopNav.jsx`, `NotificationBell.jsx`, `Toast.jsx`, `Pagination.jsx`
- Modals: `CreateTicketModal`, `EditTicketModal`, `AssignApproveModal`, `ResolveTicketModal`, `RegenerateTicketModal`, `TicketConfirmationModal`
- Demo credentials block in `Login.jsx` is wrapped in `import.meta.env.DEV` — stripped from production builds
- Design: "Kinetic Editorial" — primary accent orange `#C84B0E`, dark sidebar `#111111`

---

## Database (Supabase / PostgreSQL)

**Tables (12 total):**

| Table | Key Columns | Notes |
|-------|-------------|-------|
| `users` | id, name, first_name, last_name, phone_number, avatar_url, email, role, member_role, status, permissions TEXT[] | role: member/admin/super_admin; status: Active/invited/Disabled |
| `firms` | id, name, description | Client firms (unique name) |
| `prompts` | id, name, type, content | AI prompt templates |
| `transcripts` | id, title, raw_transcript, source, archived, fetched_at | fetched_at = NULL means manual |
| `processing_sessions` | id, transcript_id, firm_id, prompt_id, created_by | Links transcript → tickets batch |
| `tickets` | id, session_id, firm_id, assignee_id, project_id, title, description, type, priority, status, change_note, estimated_hours, ai_generated, edited, archived, deadline, regeneration_count, last_regenerated_at, revision_count | Core work item |
| `time_logs` | id, ticket_id, user_id, hours, comment, log_type, revision_cycle, created_at, updated_at | log_type: estimate/partial/final/revision/transition |
| `notifications` | id, user_id, ticket_id, type, message, read, created_at | Member alerts |
| `skills` | id, name (UNIQUE), category, created_at | Skill catalog |
| `user_skills` | user_id (FK→users), skill_id (FK→skills), created_at | Many-to-many junction; cascades on delete |
| `member_roles` | id, name (UNIQUE), created_at | Job title catalog; pre-seeded with 10 common roles |
| `projects` | id, firm_id (FK→firms), name, description, status (active/archived), created_at, updated_at | Projects per firm; unique(firm_id, name) |

**Views (3 total):**

| View | Source | Purpose |
|------|--------|---------|
| `v_tickets_full` | `021_update_v_tickets_full_projects.sql` | Tickets with firm name, project name, assignee info, aggregated time; includes deadline, regeneration_count, last_regenerated_at |
| `v_firm_ticket_stats` | `views_and_indexes.sql` + `004_add_last_ticket_at.sql` | Per-firm ticket counts and last_ticket_at |
| `v_team_workload` | `017_fix_v_team_workload.sql` | Per-member active/resolved ticket counts and hours (excludes final/revision log types from hours total) |

**RLS Policies:**
- RLS enabled on all tables including skills, user_skills, member_roles, projects
- Backend uses **service-role key** → bypasses RLS entirely
- Frontend never calls Supabase directly (all through backend API)

**Schema Application Order:**
1. `schema.sql` — base tables, RLS, indexes, triggers
2. `views_and_indexes.sql` — views and additional indexes
3. Migrations 001–024 in order

Migrations must be applied via **Supabase SQL Editor**. Do NOT wrap in `BEGIN`/`COMMIT` — Supabase SQL Editor rejects explicit transaction blocks.

### Migrations Applied (001–024)

| # | File | What it does |
|---|------|--------------|
| 001 | `001_schema_fixes.sql` | Fix v_team_workload cross-join, add indexes, enforce NOT NULL, add firms.name UNIQUE, add users.updated_at. **Uses BEGIN/COMMIT — do NOT re-run** |
| 002 | `002_manual_tickets.sql` | Add CHECK constraint for session_id vs ai_generated invariant |
| 003 | `003_ticket_delete.sql` | Add partial index for discarded ticket queries |
| 004 | `004_add_last_ticket_at.sql` | Add last_ticket_at to v_firm_ticket_stats |
| 005 | `005_add_deadline.sql` | Add `tickets.deadline DATE` nullable column |
| 006 | `006_optimize_transcript_tickets.sql` | Add `transcripts.fetched_at`, `tickets.regeneration_count`, `tickets.last_regenerated_at`; add FK indexes |
| 006b | `006_notifications.sql` | Create `notifications` table with RLS |
| 007 | `007_add_permissions.sql` | Add `users.permissions TEXT[]` column |
| 008 | `008_add_super_admin_role.sql` | Extend role CHECK to include `super_admin` |
| 009 | `009_super_admin_rls.sql` | `current_user_role()` returns `admin` for both `admin` and `super_admin` |
| 010 | `010_fix_notifications_rls.sql` | Enable RLS on notifications, add SELECT/INSERT/UPDATE policies |
| 011 | `011_update_v_tickets_full.sql` | Add deadline, regeneration_count, last_regenerated_at to v_tickets_full |
| 012 | `012_estimated_hours_convention.sql` | Documents DECIMAL(5,2) convention for fractional hours |
| 013 | `013_time_logs_updated_at.sql` | Add `time_logs.updated_at` with auto-update trigger |
| 014 | `014_add_archived_to_tickets.sql` | Add `tickets.archived BOOLEAN` with partial index |
| 015 | `015_expand_ticket_status.sql` | Expand status from 4-value to 10-value workflow; rename existing `approved` → `in_progress` rows |
| 016 | `016_revision_tracking.sql` | Add `time_logs.revision_cycle INTEGER`, `tickets.revision_count INTEGER`; expand log_type CHECK to include `revision` |
| 017 | `017_fix_v_team_workload.sql` | Recreate v_team_workload with correct `in_progress`/`revisions` active filter and exclude final/revision logs from hours |
| 018 | `018_skills_and_user_skills.sql` | Create `skills` + `user_skills` tables; add `users.member_role` and `users.status` columns with RLS |
| 019 | `019_member_roles.sql` | Create `member_roles` table; seed 10 common job titles; RLS policies |
| 020 | `020_add_projects.sql` | Create `projects` table; add `tickets.project_id` FK; auto-update trigger; RLS |
| 021 | `021_update_v_tickets_full_projects.sql` | Update `v_tickets_full` view to include project metadata |
| 022 | `022_overdue_tickets_indexes.sql` | Add performance indexes for overdue ticket queries |
| 023 | `023_user_profile_fields.sql` | Add `users.first_name`, `users.last_name`, `users.phone_number`; back-fills from existing `name` |
| 024 | `024_user_avatar.sql` | Add `users.avatar_url`; create Supabase Storage bucket `avatars` (public, 2MB, image/*); RLS for public read |

---

## Key Flows

**Transcript → Ticket pipeline:**
1. Fireflies sync runs automatically every 15 minutes via `node-cron` in `src/index.ts` (also fires once on startup). Manual trigger: `POST /api/transcripts/sync`. Transcripts are upserted to the `transcripts` table with `fetched_at = NOW()`.
2. Admin selects a transcript + firm + prompt type and calls `POST /api/transcripts/:id/process`
3. `ai.service.ts` generates `TicketDraft[]` from the transcript text and prompt
4. Tickets are inserted with `status = draft` and linked to the `processing_session`
5. Admin reviews drafts on the Firm Detail page, then assigns + approves, regenerates, or discards

**Onboarding flow (invite-based user activation):**
1. Admin creates a user with `status = 'invited'` via `POST /api/users`
2. Backend generates a signed invite token (`invite.service.ts`) and logs the onboarding URL to console (when SMTP not configured)
3. Invited user visits `/onboarding?token=<token>` — token is validated and must correspond to a user with `status = 'invited'`
4. Step 1: set password. Step 2: first name, last name, phone number. Step 3: upload + crop avatar (optional)
5. On complete: password updated in Supabase Auth, profile fields written to `users` table, `status` set to `'Active'`, session JWT returned
6. Avatar upload uses Supabase Storage bucket `avatars` — falls back to storing base64 data URL directly if bucket not set up (local dev)

**Full Ticket Lifecycle (10 statuses):**

```
draft → in_progress → resolved → internal_review → client_review → compliance_review → approved → closed
                  ↘ discarded      ↑                    ↑                  ↑
                                revisions ←─────────────┴──────────────────┘
```

Valid transitions:
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

**Regenerating tickets:**
- Admin regenerates a draft ticket — backend reads `raw_transcript` from DB and calls AI; no Fireflies API call
- Existing ticket updated in place: new `title`, `description`, `type`, `priority`; `edited = true`, `regeneration_count++`, `last_regenerated_at = NOW()`

**Resolving tickets:**
- Members resolve via `PATCH /api/tickets/:id/resolve` — only if assigned and `status IN ('in_progress', 'revisions')`
- A `final` type time log is inserted as a resolution snapshot
- Admins can resolve any approved ticket (ownership check bypassed for admin role)

---

## Time Log System

`time_logs.log_type` values:

| log_type | Description | Counted in totals? |
|----------|-------------|-------------------|
| `partial` | Regular work session log by member | Yes |
| `estimate` | Time estimate entry | Yes |
| `final` | Resolution snapshot (created on resolve) — mirrors partial totals | No (excluded to avoid double-count) |
| `revision` | Zero-hour milestone marker (created when admin sends to revisions) — acts as section divider | No (hours = 0) |
| `transition` | Status audit trail entry | No |

`time_logs.revision_cycle`:
- `0` = initial work before any revision
- `1`, `2`, ... = logs added during that revision cycle
- Set from `tickets.revision_count` at insert time

**Member Time History UI** (`member/TicketDetail.jsx`) groups logs into cycle cards:
- Cycle 0 → "INITIAL WORK" header card
- Cycle N → orange admin note banner + "REVISION N LOGS" header card
- Edit/delete buttons hidden once ticket is `resolved`, `closed`, `discarded`, or any review/approved status

---

## Work Status Display (derived — no DB column)

The `getStatusBadges(ticket, spentHours?)` function in `api.js` (legacy frontend) maps ticket state to display labels.

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

---

## Environment Variables

Copy `backend/.env.example` to `backend/.env`:

| Variable | Required | Purpose |
|---|---|---|
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Service role key (bypasses RLS); also used as HMAC secret for invite tokens |
| `SUPABASE_ANON_KEY` | Yes | Anon key (used for auth token verification) |
| `OPENAI_API_KEY` | No | GPT-4o-mini; mock fallback if absent |
| `FIREFLIES_API_KEY` | No | Fireflies GraphQL; mock fallback if absent |
| `FRONTEND_URL` | No | CORS origin + invite link base URL (default: `http://localhost:5173`) |
| `PORT` | No | Server port (default: `3000`) |
| `SUPER_ADMIN_EMAIL` | No | Seed super_admin user email on startup |
| `SUPER_ADMIN_PASSWORD` | No | Seed super_admin user password on startup |
| `SMTP_HOST` | No | SMTP server host for email sending |
| `SMTP_PORT` | No | SMTP port (default: 587) |
| `SMTP_USER` | No | SMTP username |
| `SMTP_PASS` | No | SMTP password |
| `SMTP_FROM` | No | From address (default: `noreply@aiwealth.com`) |

Frontend-new uses `frontend-new/.env` with `VITE_API_URL` (default: `http://localhost:3000/api`).

**Local dev note:** When SMTP is not configured, invite emails are printed to the backend console. The full onboarding URL including token is logged via `[invite] Onboarding link for <email>: <url>`.

**Security:** All `.env` files are gitignored. Never commit credentials.

---

## Known Constraints

- `users` table `updated_at` column may return `null` depending on DB triggers — treat as nullable throughout
- Time log insert on admin-resolved tickets records `user_id` as the admin's ID, not the assignee's. Known data accuracy limitation.
- The "New" badge on Firm Detail ticket cards uses a 15-minute client-side threshold (`Date.now()`). Not persisted — disappears on page refresh after 15 min.
- `import` statements must always appear at the top of a file before any executable code — ES module rule enforced by Vite. Placing an import after a `const` declaration silently breaks the module.
- Migration `001_schema_fixes.sql` uses `BEGIN`/`COMMIT` blocks and cannot be re-run via Supabase SQL Editor. Extract individual statements if any need to be re-applied.
- `ticket.time_spent` in list API responses is backend-computed from time_logs. On detail pages, compute from the `timeLogs` state directly (filtered to exclude `final` and `revision`) and pass as `spentHours` to `getStatusBadges()`.
- Resolved tickets lock the time-logging UI in the legacy frontend. The backend also enforces this — `createTimeLog` only accepts `status IN ('in_progress', 'revisions')`.
- Existing tickets sent back for revisions **before migration 016 was applied** will not have a `revision` type log divider. Manually insert a `revision` log with `hours=0`, `revision_cycle=1`, `comment=<admin note>` and `UPDATE tickets SET revision_count=1 WHERE id=...` to fix.
- `@untitled-ui/icons-react` uses numbered icon variants — always verify the exact export name (e.g. `UploadCloud01` not `UploadCloud`). Check `node_modules/@untitled-ui/icons-react/build/cjs/` for available names.
- Onboarding avatar upload falls back to storing base64 data URL directly in `users.avatar_url` when Supabase Storage bucket `avatars` does not exist (local dev before migration 024 is applied).
- Invite tokens use `SUPABASE_SERVICE_ROLE_KEY` as the HMAC secret — rotating this key invalidates all outstanding invite links.
