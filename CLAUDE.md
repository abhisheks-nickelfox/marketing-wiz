# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MarketingWiz is a transcript-to-ticket SaaS platform for marketing agencies. It ingests meeting transcripts from Fireflies.ai, uses GPT-4o-mini to generate actionable tickets per client firm, and provides a role-based portal for admins and team members to manage that work.

## Repository Structure

```
MarketingWiz/
├── frontend/        # React 18 + Vite SPA
├── backend/         # Express + TypeScript API (compiled to dist/)
├── database/        # Supabase schema, RLS policies, seed data, migrations
└── Docs/            # v5.0 workflow spec (source of truth for features)
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
- Frontend `ProtectedRoute` in `App.jsx` enforces role-based redirects: admin → `/admin/dashboard`, member → `/member/dashboard`
- Auth state is managed by `AuthContext.jsx` and consumed via `useAuth()`
- `logout` is client-side only — the backend returns 200 immediately; JWT invalidation is the client's responsibility (delete `mw_token` from localStorage)

### Backend Structure

Route → Controller → Supabase (direct queries, no ORM)

- All routes mount under `/api` via `src/routes/index.ts`
- `src/config/supabase.ts` uses the **service-role key** (bypasses RLS — backend is fully trusted)
- `src/types/index.ts` defines all enums and domain models; import from here rather than re-defining types
- Services in `src/services/` encapsulate third-party integrations:
  - `ai.service.ts` — OpenAI GPT-4o-mini for ticket generation; falls back to mock data if `OPENAI_API_KEY` is absent
  - `fireflies.service.ts` — GraphQL sync from Fireflies API; falls back to mock data if `FIREFLIES_API_KEY` is absent

### Frontend Structure

- `src/lib/api.js` is the single API client — all pages import from here. Add new endpoints here, never use `fetch` directly in components.
- `src/lib/api.js` also exports shared formatters: `formatDate`, `formatDuration`, `timeAgo`, `formatHours`
- Pages are split by role under `src/pages/admin/` and `src/pages/member/`
- No shared component library beyond `Sidebar.jsx` and `TopNav.jsx`
- Demo credentials block in `Login.jsx` is wrapped in `import.meta.env.DEV` — stripped from production builds

### Database (Supabase / PostgreSQL)

- 7 tables: `users`, `firms`, `prompts`, `transcripts`, `processing_sessions`, `tickets`, `time_logs`
- RLS is enabled on all tables but the backend uses the service-role key and bypasses it
- 3 views for reporting: `v_tickets_full`, `v_firm_ticket_stats`, `v_team_workload`
- Schema and seed files are in `database/` — apply via Supabase SQL Editor
- Migrations are in `database/migrations/` — apply in order via Supabase SQL Editor. Do NOT wrap in `BEGIN`/`COMMIT` — Supabase SQL Editor does not support explicit transaction blocks. Use unqualified table names (no `public.` prefix needed; search_path already includes public).
- Current migrations applied: `001_schema_fixes.sql`, `002_manual_tickets.sql`, `003_ticket_delete.sql`, `004_add_last_ticket_at.sql`, `005_add_deadline.sql`, `006_optimize_transcript_tickets.sql`, `007_add_permissions.sql`, `008_add_super_admin_role.sql`

**Migration 006 additions (2026-03-30):**
- `transcripts.fetched_at TIMESTAMPTZ` — nullable; set by `fireflies.service.ts` on every upsert to record last Fireflies sync time. `NULL` = manual transcript, never fetched from Fireflies.
- `tickets.regeneration_count INTEGER NOT NULL DEFAULT 0` — incremented each time the AI regenerate endpoint runs on a ticket. Distinct from `edited` (which also fires on manual admin edits).
- `tickets.last_regenerated_at TIMESTAMPTZ` — nullable; set to `NOW()` on each AI regeneration. `NULL` = ticket accepted on first AI draft or is a manually created ticket.
- Indexes added: `idx_processing_sessions_transcript_id`, `idx_processing_sessions_firm_id`, `idx_processing_sessions_prompt_id`, `idx_tickets_draft_firm_created_at` (partial, `status='draft'`), `idx_transcripts_fetched_at_active` (partial, for incremental sync queries)

### Key Flows

**Transcript → Ticket pipeline:**
1. Fireflies sync runs automatically every 15 minutes via `node-cron` in `src/index.ts` (also fires once on startup). Manual trigger: `GET /api/transcripts/sync`. Transcripts are upserted to the `transcripts` table with `fetched_at = NOW()`.
2. Admin selects a transcript + firm + prompt type and calls `POST /api/transcripts/:id/process`
3. `ai.service.ts` generates `TicketDraft[]` from the transcript text and prompt
4. Tickets are inserted with `status = draft` and linked to the `processing_session`
5. Admin redirected to Firm Detail page — newly created tickets show an orange **"New"** badge (visible for 15 min) and a "Created X ago" timestamp
6. Admin reviews drafts on the Firm Detail page, then assigns + approves, regenerates, or discards

**Ticket lifecycle:** `draft` → `approved` (via assign-approve) → `resolved` | `discarded`

**Regenerating tickets:**
- Admin can regenerate a specific draft ticket — the backend reads `raw_transcript` from the DB (via `session_id → processing_sessions → transcript_id`) and calls the AI service; no Fireflies API call is made
- The existing ticket record is **updated in place** (no new insert) with new `title`, `description`, `type`, `priority`; `edited = true`, `regeneration_count` incremented, `last_regenerated_at` set

**Resolving tickets:**
- Members can resolve tickets assigned to them via `PATCH /api/tickets/:id/resolve`
- Admins can resolve any approved ticket regardless of assignee — the ownership check is bypassed for `admin` role

### Work Status (derived field — no DB column)

All ticket list views (admin and member) show a **Work Status** badge derived from existing data:

| `status` | `time_spent` | Work Status shown |
|---|---|---|
| `draft` | any | Pending Approval |
| `approved` | 0 | Not Started |
| `approved` | > 0 | In Progress (blue) |
| `resolved` | any | Done (green) |
| `discarded` | any | Discarded (red) |

Use `ticket.time_spent` (the backend-computed value) — **not** `ticket.time_logs` array, which is stripped from list responses.

### Admin Ticket Filtering via URL Params

`/admin/tickets` reads URL search params on mount to pre-populate filters:
- `?firm_id=X` — pre-filters by firm
- `?status=draft|approved|resolved|discarded` — pre-filters by status
- `?assignee_id=X` — pre-filters by assignee

Stat badges on the Firm Detail page (`/admin/firms/:id`) are clickable and navigate to the ticket list with these params pre-set.

### Dashboard — Team Workload

The Team Workload panel uses `GET /api/dashboard/team-workload` (backed by `v_team_workload` view), not the simpler workload data in `GET /api/dashboard/admin`. Each member shows:
- Active ticket count (approved, unresolved)
- Resolved ticket count
- Hours logged
- Progress bar: active / total assigned ratio; green ≤3 active, amber 4–6, red >6

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

Frontend uses `frontend/.env` with `VITE_API_URL` (default: `http://localhost:3000/api`).

**Security:** `backend/.env` and all `.env` files are gitignored. Never commit credentials. If credentials were previously committed, rotate them immediately in the Supabase dashboard.

## Design System

The UI uses a "Kinetic Editorial" design language:
- Primary accent: orange `#C84B0E`
- Dark sidebar: `#111111`
- Tailwind CSS with PostCSS (no CDN — fully compiled)
- No borders/lines philosophy — separation via spacing and background color contrast
- Badge sizing: `text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded`
- Work Status badges use `rounded-sm tracking-tighter` (slightly tighter than status badges)

## Known Constraints

- `users` table `updated_at` column is referenced in type definitions and some UI pages but may return `null` depending on DB triggers — treat as nullable
- Time log insert on admin-resolved tickets records `user_id` as the admin's ID, not the assignee's. This is a known data accuracy limitation.
- The "New" badge on Firm Detail ticket cards uses a 15-minute client-side threshold (`Date.now()`). It disappears on page refresh after 15 minutes — not persisted.
- `import` statements must always appear at the top of a file before any executable code — ES module rule. Placing an import after a `const` declaration will silently break the module in Vite.
