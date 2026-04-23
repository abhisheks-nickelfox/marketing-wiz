# CLAUDE.md — Backend

This file provides guidance for working in the `backend/` directory of MarketingWiz.

## Overview

Express + TypeScript REST API. Compiled to `dist/` and run with Node. Uses Supabase (PostgreSQL) via the service-role key — no ORM, direct SQL queries.

---

## Directory Structure

```
backend/
├── src/
│   ├── index.ts                    # App entry point — Express setup, middleware, route mounting, cron
│   ├── routes/
│   │   └── index.ts                # Mounts all module routers under /api
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── dto/
│   │   │   │   ├── login.dto.ts
│   │   │   │   ├── update-profile.dto.ts
│   │   │   │   ├── complete-onboarding.dto.ts
│   │   │   │   ├── forgot-password.dto.ts
│   │   │   │   └── reset-password.dto.ts
│   │   │   ├── auth.routes.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.validation.ts        # login, profile, forgot/reset password only
│   │   │   ├── onboarding.controller.ts  # thin controller — calls onboarding.service
│   │   │   ├── onboarding.service.ts     # all onboarding business logic + DB queries
│   │   │   └── onboarding.validation.ts  # validateToken, completeOnboarding, uploadAvatar
│   │   ├── users/
│   │   │   ├── dto/
│   │   │   │   ├── create-user.dto.ts
│   │   │   │   └── update-user.dto.ts
│   │   │   ├── users.routes.ts
│   │   │   ├── users.controller.ts
│   │   │   ├── users.service.ts
│   │   │   └── users.validation.ts
│   │   ├── tasks/
│   │   │   ├── dto/
│   │   │   │   ├── create-task.dto.ts
│   │   │   │   ├── update-task.dto.ts
│   │   │   │   ├── assign-approve-task.dto.ts
│   │   │   │   ├── create-time-log.dto.ts
│   │   │   │   └── update-time-log.dto.ts
│   │   │   ├── tasks.routes.ts
│   │   │   ├── tasks.controller.ts
│   │   │   ├── tasks.service.ts
│   │   │   ├── tasks.validation.ts
│   │   │   ├── time-logs.controller.ts   # thin controller — calls time-logs.service
│   │   │   ├── time-logs.service.ts      # all time-log business logic + DB queries
│   │   │   └── time-logs.validation.ts
│   │   ├── firms/
│   │   │   ├── dto/
│   │   │   │   ├── create-firm.dto.ts
│   │   │   │   └── update-firm.dto.ts
│   │   │   ├── firms.routes.ts
│   │   │   ├── firms.controller.ts
│   │   │   ├── firms.service.ts
│   │   │   └── firms.validation.ts
│   │   ├── projects/
│   │   │   ├── dto/
│   │   │   │   ├── create-project.dto.ts
│   │   │   │   └── update-project.dto.ts
│   │   │   ├── projects.routes.ts
│   │   │   ├── projects.controller.ts
│   │   │   ├── projects.service.ts
│   │   │   └── projects.validation.ts
│   │   ├── skills/
│   │   │   ├── dto/
│   │   │   │   └── create-skill.dto.ts
│   │   │   ├── skills.routes.ts
│   │   │   ├── skills.controller.ts
│   │   │   ├── skills.service.ts
│   │   │   └── skills.validation.ts
│   │   ├── member-roles/
│   │   │   ├── dto/
│   │   │   │   └── create-member-role.dto.ts
│   │   │   ├── member-roles.routes.ts
│   │   │   ├── member-roles.controller.ts
│   │   │   ├── member-roles.service.ts
│   │   │   └── member-roles.validation.ts
│   │   ├── transcripts/
│   │   │   ├── transcripts.routes.ts
│   │   │   ├── transcripts.controller.ts
│   │   │   ├── transcripts.service.ts
│   │   │   └── transcripts.validation.ts
│   │   ├── dashboard/
│   │   │   ├── dashboard.routes.ts
│   │   │   ├── dashboard.controller.ts
│   │   │   └── dashboard.service.ts
│   │   ├── prompts/
│   │   │   ├── prompts.routes.ts
│   │   │   ├── prompts.controller.ts
│   │   │   ├── prompts.service.ts
│   │   │   └── prompts.validation.ts
│   │   ├── notifications/
│   │   │   ├── notifications.routes.ts
│   │   │   ├── notifications.controller.ts
│   │   │   ├── notifications.service.ts
│   │   │   └── notifications.validation.ts
│   │   └── team/                         # legacy — wraps users; prefer /api/users for new work
│   │       ├── team.routes.ts
│   │       ├── team.controller.ts
│   │       ├── team.service.ts
│   │       └── team.validation.ts
│   ├── middleware/
│   │   ├── auth.ts           # authenticate() — verifies JWT, attaches req.user
│   │   └── rbac.ts           # requireAdmin(), requireMember(), requireSuperAdmin(), requirePermission()
│   ├── services/
│   │   ├── ai.service.ts             # Groq/OpenAI ticket generation (mock fallback)
│   │   ├── fireflies.service.ts      # Fireflies GraphQL sync (mock fallback)
│   │   ├── invite.service.ts         # HMAC-SHA256 invite token gen + verification
│   │   ├── email.service.ts          # Nodemailer (console fallback when SMTP absent)
│   │   └── password-reset.service.ts # Supabase Auth password reset flow
│   ├── config/
│   │   ├── constants.ts      # ALL shared constants — import from here, never redefine locally
│   │   ├── supabase.ts       # Supabase client (service-role key — bypasses RLS)
│   │   └── logger.ts         # Pino structured logger — use instead of console.log
│   ├── types/
│   │   └── index.ts          # Domain types, enums, AuthenticatedRequest interface
│   └── __tests__/            # Jest test suite — all tests live here (not inside modules)
│       ├── helpers/
│       │   ├── mockAuth.ts       # makeAdminUser() / makeMemberUser()
│       │   └── mockSupabase.ts   # mockDbQueue — queue-based Supabase mock
│       ├── auth/
│       │   ├── login.test.ts
│       │   └── onboarding.test.ts
│       └── users/
│           ├── users.test.ts
│           ├── users.controller.test.ts
│           ├── users.service.test.ts
│           └── phone-validation.test.ts
├── dist/                     # Compiled output — never edit directly
├── jest.config.js
├── package.json
└── tsconfig.json
```

---

## Commands

```bash
npm run dev      # ts-node-dev with hot reload on :3000
npm run build    # tsc → compiles to dist/
npm start        # Run compiled dist/index.js (production)
npm test         # NODE_ENV=test jest --forceExit
```

**Always run `npm run build` after editing TypeScript source.** The server runs from `dist/`, not `src/`.

---

## Module Architecture

Every feature lives in `src/modules/<name>/` with this exact structure:

```
src/modules/<name>/
  dto/
    create-<name>.dto.ts    # TypeScript interface for create payload
    update-<name>.dto.ts    # TypeScript interface for update payload
  <name>.routes.ts          # Express Router — wire validation middleware + controller
  <name>.controller.ts      # Parse req → call service → send res (no business logic)
  <name>.service.ts         # All business logic + DB queries
  <name>.validation.ts      # express-validator chains exported as arrays
```

### Layer rules

| Layer | Responsibility | Must NOT |
|---|---|---|
| **routes** | Wire `authenticate` → `requireAdmin/Member` → validation → controller | Contain logic |
| **controller** | Parse `req`, call service, `res.status(N).json()` | Query DB, contain business rules |
| **service** | Supabase queries, business rules, call external services | Parse HTTP req/res |
| **validation** | express-validator chains, return `400 { error }` on failure | Contain business logic |
| **dto** | TypeScript interface of the input shape | Contain runtime code |

### Golden rules
- Import all constants from `src/config/constants.ts` — never redefine inline
- Use `logger` from `src/config/logger.ts` — never `console.log` / `console.error`
- Error responses are always `{ error: string }` shape
- All routes have validation middleware applied before the controller

### Special cases
- `auth/onboarding.controller.ts` + `onboarding.service.ts` + `onboarding.validation.ts` — onboarding is split from main auth files because it is a distinct public flow (no JWT required)
- `tasks/time-logs.controller.ts` + `time-logs.service.ts` + `time-logs.validation.ts` — time logs are a sub-resource of tasks, kept in the same module folder
- `team/` module is legacy — it wraps `users/`. Do not add new endpoints here; use `users/` instead

---

## Shared Constants (`src/config/constants.ts`)

**Always import from here. Never redefine locally.**

| Constant | Value / Source | Purpose |
|----------|----------------|---------|
| `FRONTEND_URL` | `process.env.FRONTEND_URL ?? 'http://localhost:5173'` | CORS, invite links, reset links |
| `VALID_ROLES` | `['admin', 'member', 'super_admin']` | All DB-valid roles |
| `ADMIN_ROLES` | `['admin', 'super_admin']` | Roles that pass `requireAdmin` |
| `MEMBER_ROLES` | `['admin', 'member', 'super_admin']` | Roles that pass `requireMember` |
| `VALID_USER_STATUSES` | `['Active', 'invited', 'Disabled']` | |
| `VALID_TASK_TYPES` | `['task', 'design', 'development', 'account_management']` | |
| `VALID_TASK_PRIORITIES` | `['low', 'normal', 'high', 'urgent']` | |
| `STATUS_PRIORITY` | `{ draft: 0, in_progress: 1, … }` | Sort order for task statuses |
| `VALID_STATUSES` | derived from `STATUS_PRIORITY` keys | All 10 task statuses |
| `VALID_TRANSITIONS` | `Record<string, string[]>` | Allowed status transitions (enforced in tasks service) |
| `PAST_DEADLINE_STATUSES` | active non-terminal statuses | Overdue ticket queries |
| `STALE_APPROVED_DAYS` | `7` | Days before approved ticket flagged stale |
| `MIN_TRANSCRIPT_WORDS` | `50` | Minimum words before AI processing allowed |
| `INVITE_TOKEN_EXPIRY_MS` | `86_400_000` (24h) | Invite link lifetime |
| `RESET_TOKEN_EXPIRY_MS` | `3_600_000` (1h) | Password reset token lifetime |
| `AI_MODEL` | `process.env.AI_MODEL ?? 'llama-3.3-70b-versatile'` | Groq model — overridable via env |
| `AI_GENERATE_MAX_TOKENS` | `2000` | Token budget for batch ticket generation |
| `AI_REGENERATE_MAX_TOKENS` | `500` | Token budget for single ticket regeneration |
| `AI_TEMPERATURE` | `0.3` | Sampling temperature |
| `MIN_TIME_LOG_HOURS` | `0.01` | |
| `MAX_TIME_LOG_HOURS` | `999.99` | |
| `DASHBOARD_RECENT_LIMIT` | `5` | Items returned in dashboard recent-activity queries |

---

## Authentication & RBAC

- JWT issued by Supabase Auth. Client sends `Authorization: Bearer <token>`.
- `authenticate` (middleware/auth.ts): verifies JWT via Supabase anon client → fetches full profile from `users` table → attaches to `req.user`.
- Middleware chain: `authenticate` → `requireAdmin` / `requireMember` / `requireSuperAdmin` / `requirePermission(key)`

| Guard | Passes |
|---|---|
| `requireMember` | `admin`, `member`, `super_admin` |
| `requireAdmin` | `admin`, `super_admin` |
| `requireSuperAdmin` | `super_admin` only |
| `requirePermission(key)` | users whose `permissions[]` contains `key` |

**Permission keys** (stored in `users.permissions TEXT[]`):

| Key | Description |
|---|---|
| `manage_firms` | Create and edit client firms |
| `manage_projects` | Create, edit and archive projects |
| `process_transcripts` | Access and process meeting transcripts |
| `view_all_tickets` | See all tasks across the team |
| `manage_prompts` | Edit AI prompt templates |

---

## Validation Pattern

All validation uses **express-validator**. Chains live in `<name>.validation.ts`, applied as route middleware before the controller.

```ts
// <name>.routes.ts
router.post('/', createUserValidation, createUser);

// <name>.validation.ts
export const createUserValidation = [
  body('email').isEmail().normalizeEmail(),
  body('name').trim().notEmpty(),
  body('phone_number')
    .optional({ nullable: true, checkFalsy: true })
    .matches(/^\+[1-9]\d{6,14}$/)
    .withMessage('Phone must be E.164: +[country code][7-15 digits]'),
  validationMiddleware,   // reads validationResult, returns 400 { error } if any
];
```

**Phone number — E.164 enforced** (`/^\+[1-9]\d{6,14}$/`):
- Must start with `+` and non-zero country code digit
- 7–15 digits total after the `+`
- Field is optional — `null` / `undefined` / `''` all accepted

**Error response shape** — always `{ error: string }`, never nested.

---

## Domain Types (`src/types/index.ts`)

```ts
type UserRole     = 'admin' | 'member' | 'super_admin'
type UserStatus   = 'Active' | 'invited' | 'Disabled'
type TaskStatus   = 'draft' | 'in_progress' | 'resolved' | 'internal_review'
                  | 'client_review' | 'compliance_review' | 'approved'
                  | 'closed' | 'revisions' | 'discarded'
type TaskType     = 'task' | 'design' | 'development' | 'account_management'
type TaskPriority = 'low' | 'normal' | 'high' | 'urgent'
type LogType      = 'estimate' | 'partial' | 'final' | 'revision' | 'transition'
type PermissionKey = 'manage_firms' | 'manage_projects' | 'process_transcripts'
                   | 'view_all_tickets' | 'manage_prompts'

interface AuthenticatedRequest extends Request { user?: User }
interface ApiResponse<T = unknown> { data?: T; error?: string; message?: string }
```

Import domain types from here. `constants.ts` also exports `UserRole`, `UserStatus`, `TaskType`, `TaskPriority` as derived types — prefer `types/index.ts` for model interfaces, `constants.ts` for runtime arrays and values.

---

## Services

### `ai.service.ts`
- Groq API (OpenAI-compatible SDK) for ticket/task generation
- Model controlled by `AI_MODEL` constant (env-overridable)
- Falls back to deterministic mock data when `OPENAI_API_KEY` is absent
- `generateTickets(transcript, prompt)` → `TaskDraft[]`
- `regenerateTicket(transcript, existingTask, prompt)` → `TaskDraft`

### `fireflies.service.ts`
- GraphQL sync from Fireflies API, upserts transcripts into `transcripts` table
- Falls back to mock transcripts when `FIREFLIES_API_KEY` is absent
- Called by cron every 15 min (`src/index.ts`) and by `POST /api/transcripts/sync`

### `invite.service.ts`
- `generateInviteToken(userId, email, nonce)` → HMAC-SHA256 signed JWT-like token, 24h expiry
- `verifyInviteToken(token)` → `{ userId, email, nonce }` or throws
- Secret key: `SUPABASE_SERVICE_ROLE_KEY` — rotating it invalidates all outstanding links
- `users.invite_nonce` is rotated on every invite/resend; old links become invalid immediately

### `email.service.ts`
- `sendInviteEmail(to, name, inviteUrl)` — onboarding invite email
- `sendProfileUpdateEmail(to, name)` — notifies member of admin-made profile changes
- Falls back to `logger.info()` (console) when SMTP env vars absent
- From address: `noreply@marketingwiz.app`

### `password-reset.service.ts`
- `sendPasswordReset(email)` → triggers Supabase Auth magic link / reset email
- `resetPassword(token, newPassword)` → validates Supabase token, updates password

---

## Testing

**Framework:** Jest + ts-jest + supertest.

```bash
npm test    # NODE_ENV=test jest --forceExit
```

All tests live in `src/__tests__/`. **Do not put tests inside module folders.**

### Test structure

```
src/__tests__/
  helpers/
    mockAuth.ts           # makeAdminUser(), makeMemberUser() factory functions
    mockSupabase.ts       # mockDbQueue — queue-based Supabase mock
  auth/
    login.test.ts         # 8 tests  — POST /api/auth/login
    onboarding.test.ts    # 12 tests — GET /validate + POST /complete
  users/
    users.test.ts         # 14 tests — user CRUD, auth, RBAC
    users.controller.test.ts
    users.service.test.ts
    phone-validation.test.ts  # 12 tests — E.164 phone validation
```

### Key patterns

**Queue-based DB mock** — many service methods issue 2–4 sequential Supabase calls per request. Push results in order:

```ts
import { mockDbQueue } from '../helpers/mockSupabase';

mockDbQueue.push({ data: [{ id: '1', name: 'Test' }], error: null }); // 1st call
mockDbQueue.push({ data: null, error: null });                          // 2nd call
```

**Auth injection** — bypass JWT verification per test:

```ts
import { makeAdminUser } from '../helpers/mockAuth';

jest.mock('../../middleware/auth', () => ({
  authenticate: (req, _res, next) => { req.user = makeAdminUser(); next(); }
}));
```

**App isolation** — `src/index.ts` wraps `app.listen()` in `if (process.env.NODE_ENV !== 'test')` so importing `app` in tests never starts the server.

### Known failing tests
- 2 tests in `phone-validation.test.ts` fail due to a pre-existing bug: `users.service.ts` calls `phone_number.trim()` without a null-guard. Fix: `phone_number?.trim() || null`.

---

## Environment Variables

| Variable | Required | Purpose |
|---|---|---|
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Service-role key (bypasses RLS); HMAC secret for invite tokens |
| `SUPABASE_ANON_KEY` | Yes | Anon key for JWT verification in `authenticate` middleware |
| `OPENAI_API_KEY` | No | Groq API key; mock fallback if absent |
| `FIREFLIES_API_KEY` | No | Fireflies GraphQL API key; mock fallback if absent |
| `FRONTEND_URL` | No | CORS origin + base URL for invite/reset links (default: `http://localhost:5173`) |
| `PORT` | No | Server port (default: `3000`) |
| `AI_MODEL` | No | Groq model name (default: `llama-3.3-70b-versatile`) |
| `SUPER_ADMIN_EMAIL` | No | Bootstraps a super_admin user on startup if not exists |
| `SUPER_ADMIN_PASSWORD` | No | Password for bootstrapped super_admin |
| `SMTP_HOST` | No | SMTP server hostname |
| `SMTP_PORT` | No | SMTP port (default: `587`) |
| `SMTP_USER` | No | SMTP username |
| `SMTP_PASS` | No | SMTP password |
| `SMTP_FROM` | No | From address (default: `noreply@marketingwiz.app`) |

**Security:** All `.env` files are gitignored. Never commit credentials. Rotating `SUPABASE_SERVICE_ROLE_KEY` invalidates all outstanding invite links.

---

## Known Constraints

- **Service-role key** — all Supabase queries bypass RLS. The backend is fully trusted; RLS policies exist only for potential future direct-client access.
- **`users.updated_at`** may be `null` if the DB trigger hasn't fired — treat as nullable everywhere.
- **Migrations** — apply via Supabase SQL Editor only. Never wrap in `BEGIN`/`COMMIT`.
- **`users.invite_nonce`** — rotated on every invite creation and resend. Any outstanding onboarding link is immediately invalidated when a new invite is sent for the same user.
- **`SUPABASE_SERVICE_ROLE_KEY` rotation** — invalidates all outstanding invite tokens (it is the HMAC signing secret).
- **`team/` module** — legacy wrapper over users. Do not add new endpoints here; use `users/` for all new work.
- **Cron job** — Fireflies sync runs every 15 min from `src/index.ts`. Only one app instance should run per deployment to avoid duplicate syncs.
- **Time log `user_id`** — on admin-resolved tickets the log records the admin's ID, not the assignee's. Known data accuracy limitation.
- **`phone_number?.trim() || null`** — `users.service.ts` has a null-guard bug on `phone_number.trim()`. Until fixed, passing `null` for phone on update will throw a 500.
