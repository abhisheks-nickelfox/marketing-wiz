# MarketingWiz QA Bug Report

**Date:** 2026-03-30
**Scope:** Full codebase audit — backend (Express/TypeScript), frontend (React 18/Vite), database (Supabase)
**Analyst:** QA Engineer (Claude Code)

---

## Summary

The codebase is generally well-structured and follows the architecture described in CLAUDE.md. Auth middleware is applied correctly on all routes, the API client (`src/lib/api.js`) is used consistently across all frontend components, and TypeScript types are imported from `src/types/index.ts`. The ticket lifecycle (`draft → approved → resolved | discarded`) is correctly enforced at the backend level.

However, several significant issues were found spanning security (a committed service-role key), logic correctness (a broken `resolveTicket` restriction that blocks all admins), RBAC gaps (member can resolve tickets they are not assigned to if they are an admin), dead code (an entire page is registered but never routed to correctly), and a number of medium/low severity issues around error handling, data integrity, and UX edge cases.

**Issue counts:** 3 Critical | 5 High | 6 Medium | 5 Low

---

## Critical Issues

### CRIT-01 — Live Supabase service-role key and URL committed to `.env`

**File:** `backend/.env` (lines 3–4)

**Description:**
The `.env` file containing the live Supabase project URL and service-role JWT is committed to the repository. The service-role key bypasses all Row Level Security and grants full database access. This credential is effectively public to anyone with repository access.

```
SUPABASE_URL=https://qtrkmxplboonzaasahpg.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Impact:** Complete database compromise. Any attacker with read access to the repo can read all data, impersonate any user, and delete all records. The service-role key cannot be scoped or rate-limited at the RLS layer.

**Fix:**
1. Immediately rotate the Supabase service-role key and anon key in the Supabase dashboard.
2. Remove `backend/.env` from the repository and ensure `.env` is in `.gitignore`.
3. Use `backend/.env.example` (with placeholder values) as the only committed reference.

---

### CRIT-02 — `resolveTicket` blocks admins from resolving tickets assigned to others

**File:** `backend/src/controllers/tickets.controller.ts` (lines 489–493)

**Description:**
The `resolveTicket` handler uses `requireMember` middleware (which allows both `admin` and `member`), but the ownership check inside the handler is unconditional — it compares `ticket.assignee_id` against `req.user.id` for all callers regardless of role. An admin who is not the assignee receives a 403.

```typescript
// Current code — applies to ALL roles including admin
if (ticket.assignee_id !== req.user.id) {
  res.status(403).json({ error: 'Only the assignee can resolve this ticket' });
  return;
}
```

**Impact:** Admins cannot resolve tickets that are assigned to team members, which is a core workflow requirement (e.g., resolving a ticket when the assignee is unavailable). The admin UI in `AdminTicketDetail.jsx` does not expose a resolve button (since that page only shows draft-state actions), but any direct API call by an admin is blocked.

**Fix:**
```typescript
// Allow admins to bypass the assignee check
if (req.user.role !== 'admin' && ticket.assignee_id !== req.user.id) {
  res.status(403).json({ error: 'Only the assignee can resolve this ticket' });
  return;
}
```

---

### CRIT-03 — `deleteFirm` silently succeeds for non-existent firm IDs

**File:** `backend/src/controllers/firms.controller.ts` (lines 230–246)

**Description:**
The `deleteFirm` controller issues a `DELETE` against the `firms` table with `.eq('id', id)` but never checks whether the row existed before or after deletion. If the given `id` does not match any firm, Supabase returns no error and `data` is an empty result set — but the controller still returns HTTP 200 `{ message: 'Firm deleted successfully' }`.

Additionally, there is no validation that `id` is a valid UUID. A malformed ID such as `'; DROP TABLE firms; --` will be passed directly to Supabase. While Supabase's parameterised queries prevent SQL injection here, the lack of format validation is a defence-in-depth gap. No UUID validation middleware is applied to `DELETE /api/firms/:id` unlike most other routes in the codebase.

```typescript
// Current code — no existence check, no UUID validation on :id
export async function deleteFirm(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    const { error } = await supabase.from('firms').delete().eq('id', id);
    if (error) { ... }
    res.json({ message: 'Firm deleted successfully' });  // always 200
  }
}
```

**Fix:**
```typescript
export async function deleteFirm(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;
  // Validate UUID format first
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    res.status(400).json({ error: 'Invalid firm ID' });
    return;
  }
  try {
    // Verify existence before deleting
    const { data: firm, error: fetchErr } = await supabase
      .from('firms').select('id').eq('id', id).single();
    if (fetchErr || !firm) {
      res.status(404).json({ error: 'Firm not found' });
      return;
    }
    const { error } = await supabase.from('firms').delete().eq('id', id);
    if (error) { res.status(500).json({ error: error.message }); return; }
    res.json({ message: 'Firm deleted successfully' });
  } catch (err) { ... }
}
```

---

## High Severity Issues

### HIGH-01 — `toggleArchive` accepts unvalidated `:id` parameter

**File:** `backend/src/controllers/transcripts.controller.ts` (lines 147–180)
**Route:** `PATCH /api/transcripts/:id/archive`

**Description:**
The `toggleArchive` handler reads `req.params.id` directly without any UUID validation. The `createTranscriptValidation` and `processValidation` arrays both include `param('id').isUUID()`, but `toggleArchive` has no corresponding validation middleware in the route definition (`transcripts.ts` line 28). A non-UUID string will be passed to Supabase's `.eq('id', id)` call.

```typescript
// backend/src/routes/transcripts.ts line 28 — no validation middleware
router.patch('/:id/archive', toggleArchive);
```

While Supabase's parameterised queries prevent injection, the `.single()` call will throw a `PGRST116` error (no rows found) for any junk ID, producing an uncontrolled error path. The handler does catch `fetchError` and returns 404, so the impact is limited, but the missing validation is inconsistent with every other `:id` route in the project.

**Fix:** Add `param('id').isUUID('loose')` validation and wire it into the route:
```typescript
// transcripts.ts
router.patch('/:id/archive', [param('id').isUUID('loose').withMessage('Invalid transcript ID')], toggleArchive);
```

---

### HIGH-02 — `createTicket` controller missing `try/catch` around firm existence check

**File:** `backend/src/controllers/tickets.controller.ts` (lines 70–112)

**Description:**
The `createTicket` function performs a Supabase firm-existence check and ticket insert outside of any `try/catch` block (the try block starts on line 87, but the firm check on lines 80–85 is outside it). An unexpected network error from the firm-check query will cause an unhandled promise rejection and a raw Node.js crash rather than a controlled 500 response.

```typescript
export async function createTicket(req: AuthenticatedRequest, res: Response): Promise<void> {
  // ... validation ...
  const { firm_id, ... } = req.body;

  // THIS IS OUTSIDE try/catch — unhandled rejection possible
  const { data: firm, error: firmErr } = await supabase
    .from('firms').select('id').eq('id', firm_id).single();
  if (firmErr || !firm) { res.status(404)...; return; }

  const { data: ticket, error } = await supabase  // also outside try/catch
    .from('tickets').insert({...}).select().single();
  ...
```

**Fix:** Wrap the entire function body in `try/catch`:
```typescript
export async function createTicket(req: AuthenticatedRequest, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { ... return; }
  const { firm_id, title, type, priority = 'normal', description } = req.body;
  try {
    const { data: firm, error: firmErr } = await supabase...
    // ... rest of handler
  } catch (err) {
    console.error('[tickets.controller] createTicket error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
```

---

### HIGH-03 — `logout` signs out the shared service-role client, not the user's session

**File:** `backend/src/controllers/auth.controller.ts` (lines 58–69)

**Description:**
`supabase.auth.signOut()` is called on the global service-role Supabase client. The service-role client does not hold user sessions — it authenticates via the service key. Calling `signOut()` on it has no effect on the user's JWT and may produce unexpected side-effects in the Supabase client's internal state. The user's token remains valid until it naturally expires; no server-side invalidation occurs.

This is a known limitation when using Supabase with JWTs (there is no server-side revocation without additional infrastructure), but the comment in the code (`// so active sessions are invalidated server-side`) is misleading and the call itself is a no-op at best.

```typescript
// auth.controller.ts line 61 — signOut on service-role client is ineffective
const { error } = await supabase.auth.signOut();
```

**Fix:** Remove the `supabase.auth.signOut()` call and document that logout is client-side token deletion only. If server-side revocation is required, use Supabase Admin API `auth.admin.signOut(userId)` with the user's ID from `req.user`:

```typescript
export async function logout(req: AuthenticatedRequest, res: Response): Promise<void> {
  // JWT-based auth: server-side invalidation requires explicit session revocation
  if (req.user) {
    await supabase.auth.admin.signOut(req.user.id);  // revokes all sessions for this user
  }
  res.json({ message: 'Logged out successfully' });
}
```

---

### HIGH-04 — `TranscriptProcessing.jsx` is a dead page — route points to `TranscriptsList`

**File:** `frontend/src/App.jsx` (line 70–73)

**Description:**
A dedicated `TranscriptProcessing` component exists at `frontend/src/pages/admin/TranscriptProcessing.jsx`, but the route `/admin/transcripts/process` in `App.jsx` renders `TranscriptsList` instead of `TranscriptProcessing`:

```jsx
// App.jsx lines 70–73 — wrong component on the process route
<Route
  path="/admin/transcripts/process"
  element={<ProtectedRoute requiredRole="admin"><TranscriptsList /></ProtectedRoute>}
/>
```

`TranscriptProcessing` is never imported and never rendered anywhere. Meanwhile, `AdminDashboard.jsx` (line 187) deep-links to `/admin/transcripts/process?id=${t.id}`, which correctly shows `TranscriptsList` (which handles the `?id=` param to pre-select a transcript). The duplicate page (`TranscriptProcessing.jsx`) appears to be an earlier implementation that was superseded by the inline panel in `TranscriptsList.jsx` but was never cleaned up.

**Impact:** Dead code in the bundle; cognitive confusion for future developers; `TranscriptProcessing.jsx` has its own full page fetch of all transcripts (`transcriptsApi.list('all')`) which is wasteful.

**Fix (Option A — preferred):** Delete `TranscriptProcessing.jsx` and remove the route:
```jsx
// Remove these lines from App.jsx:
// import TranscriptProcessing from './pages/admin/TranscriptProcessing'
// <Route path="/admin/transcripts/process" element={...TranscriptsList...} />
```

**Fix (Option B):** If `TranscriptProcessing` is intentionally kept as a standalone page, fix the route to import and render it, and update the Dashboard link accordingly.

---

### HIGH-05 — Member can log time on a ticket in `draft` status

**File:** `backend/src/controllers/timeLogs.controller.ts` (lines 102–105)

**Description:**
`createTimeLog` rejects time logs on `discarded` tickets but permits them on `draft` tickets. A `draft` ticket has not been assigned yet — by definition `assignee_id` is `null`. The member access check on line 97 (`ticket.assignee_id !== req.user.id`) will therefore always be `true` for drafts, triggering a 403. However, an admin can still log time on a draft ticket via this endpoint (since admins skip the assignee check). Logging time on a draft ticket is semantically incorrect — work hasn't been approved yet.

```typescript
// timeLogs.controller.ts line 102
if (ticket.status === 'discarded') {  // should also reject 'draft'
  res.status(400).json({ error: 'Cannot log time on a discarded ticket' });
  return;
}
```

**Fix:**
```typescript
if (ticket.status === 'discarded' || ticket.status === 'draft') {
  res.status(400).json({ error: 'Cannot log time on a draft or discarded ticket' });
  return;
}
```

---

## Medium Severity Issues

### MED-01 — `users` table missing `updated_at` column but `team.controller` references it

**File:** `database/schema.sql` (lines 13–19), `backend/src/controllers/team.controller.ts` (line 11), `backend/src/types/index.ts` (line 19)

**Description:**
The `users` table schema defines only `id, email, name, role, created_at` — there is no `updated_at` column. However:
- `src/types/index.ts` declares `updated_at: string` on the `User` interface (line 19).
- `team.controller.ts` selects `updated_at` from the `users` table (line 11): `select('id, name, email, role, created_at, updated_at')`.
- `TeamList.jsx` and `MemberEdit.jsx` render `selectedMember.updated_at` / `member.updated_at`.

This means `updated_at` will always return `null` from the database for all `users` queries, and the `User` type is inaccurate. The `TeamList.jsx` conditional on line 197 (`selectedMember.updated_at !== selectedMember.created_at`) will never render the "Last updated" field.

**Fix:** Either add `updated_at TIMESTAMPTZ DEFAULT NOW()` to the `users` table with an `UPDATE` trigger (consistent with the `tickets` table), or remove `updated_at` from the `User` type, all selects, and the UI.

---

### MED-02 — `AuthContext` does not restore `user` state after session recovery when token verification fails silently

**File:** `frontend/src/context/AuthContext.jsx` (lines 17–22)

**Description:**
On mount, `AuthContext` calls `authApi.me()` to validate the stored token. If the call fails (network error, expired token, server error), `clearToken()` is called and `setLoading(false)` is set via `.finally()`. However, `setUser` is never explicitly called to `null` in the catch path — it remains at its initial `null` value from `useState(null)`. This is currently harmless but only by coincidence (initial value is already `null`). A future refactor that changes the initial state or adds a pre-hydration optimistic state would break the auth flow silently.

More importantly, the `.catch()` callback swallows the error entirely with no user-visible feedback. If a non-expired token fails to verify (e.g., a Supabase outage), the user is silently logged out.

```javascript
// AuthContext.jsx lines 17–22
authApi
  .me()
  .then((res) => setUser(res.data))
  .catch(() => clearToken())  // silent — swallows the error, no feedback
  .finally(() => setLoading(false))
```

**Fix:** The error should be handled more explicitly:
```javascript
authApi
  .me()
  .then((res) => setUser(res.data))
  .catch(() => {
    clearToken();
    setUser(null);  // explicit, defensive
  })
  .finally(() => setLoading(false))
```

---

### MED-03 — Demo credentials hard-coded in `Login.jsx` (production security risk)

**File:** `frontend/src/pages/Login.jsx` (lines 158–171)

**Description:**
The login page renders a visible "Demo Credentials" panel with plaintext admin and member passwords:

```jsx
<p className="text-on-surface-variant">Admin@1234</p>
...
<p className="text-on-surface-variant">Member@1234</p>
```

This is appropriate only for a development/demo environment. If this codebase is deployed to production, these credentials are publicly visible to any unauthenticated user who visits the login page.

**Fix:** Gate this panel behind an environment variable:
```jsx
{import.meta.env.DEV && (
  <div className="mt-6 ...">
    {/* Demo Credentials panel */}
  </div>
)}
```

---

### MED-04 — `resolveTicket` creates a time log with `hours: 0` when `final_comment` is provided but `estimated_hours` is undefined

**File:** `backend/src/controllers/tickets.controller.ts` (lines 518–525)

**Description:**
When a member resolves a ticket with a `final_comment` but no `estimated_hours`, a time log entry is created with `hours: 0`:

```typescript
if (final_comment) {
  await supabase.from('time_logs').insert({
    ticket_id: id,
    user_id: req.user.id,
    hours: estimated_hours ?? 0,  // defaults to 0 if not provided
    comment: final_comment,
    log_type: 'final',
  });
}
```

A time log with `hours: 0` is semantically meaningless (the `createTimeLog` validation requires `hours >= 0.01`) and will pollute the time-log history. The member's total hours will be unaffected numerically, but it creates a spurious record visible in the time log table.

**Fix:** Only insert the time log if `estimated_hours` is defined and greater than 0, or make `estimated_hours` required when `final_comment` is provided:
```typescript
if (final_comment && estimated_hours !== undefined && estimated_hours > 0) {
  await supabase.from('time_logs').insert({...});
}
```

---

### MED-05 — `updateTicket` allows members to set `estimated_hours: 0` on resolved/discarded tickets

**File:** `backend/src/controllers/tickets.controller.ts` (lines 255–264)

**Description:**
The member branch of `updateTicket` does not check the ticket's `status` before updating `estimated_hours`. A member can update `estimated_hours` on a resolved or discarded ticket, even though the ticket workflow is complete. The admin branch correctly blocks edits on resolved/discarded tickets (lines 246–249), but this guard is absent for members.

```typescript
// member branch — no status check
if ('estimated_hours' in req.body) {
  updates['estimated_hours'] = req.body['estimated_hours'];
}
```

**Fix:** Add a status guard for members mirroring the admin guard:
```typescript
} else {
  // member
  if (existing.status === 'resolved' || existing.status === 'discarded') {
    res.status(400).json({ error: 'Cannot edit a resolved or discarded ticket' });
    return;
  }
  if (existing.assignee_id !== req.user.id) { ... }
  ...
}
```

---

### MED-06 — `FirmDetail.jsx` fetches tickets via `ticketsApi.list` but `getFirm` backend endpoint also fetches them — double load

**File:** `frontend/src/pages/admin/FirmDetail.jsx` (lines 33–50), `backend/src/controllers/firms.controller.ts` (lines 149–173)

**Description:**
`FirmDetail.jsx` uses `Promise.all([firmsApi.get(id), ticketsApi.list({ firm_id: id })])` to fetch both firm metadata and its tickets. The `firmsApi.get(id)` call hits `GET /api/firms/:id` which itself fetches the firm's tickets internally (firms.controller.ts lines 149–157) and returns them in `data.tickets`. The frontend then ignores `firmRes.data.tickets` entirely and uses `ticketsRes.data` instead.

This means every firm detail page load triggers two full ticket fetches for the same firm. For a firm with many tickets, this doubles the database load.

**Fix:** Either use the tickets from `firmRes.data.tickets` (already fetched) and remove the separate `ticketsApi.list` call, or change `getFirm` to not include tickets in its response and rely entirely on the separate list call. The current duplication is wasteful.

---

## Low Severity Issues

### LOW-01 — `login` response includes full user profile with `select('*')` — potential over-exposure

**File:** `backend/src/controllers/auth.controller.ts` (lines 37–46)

**Description:**
The login response returns the full user profile row via `select('*')`. If the `users` table schema is ever extended to include sensitive fields (e.g., API keys, internal flags, audit fields), those fields will be included in the login response without any change to the controller. The current schema is safe, but this is a brittle pattern.

**Fix:** Enumerate the fields explicitly:
```typescript
.select('id, email, name, role, created_at')
```

---

### LOW-02 — `MemberTicketList.jsx` passes `assignee_id: user.id` as a filter but the backend ignores it for members

**File:** `frontend/src/pages/member/MemberTicketList.jsx` (lines 68–74)

**Description:**
The member ticket list calls `ticketsApi.list({ assignee_id: user.id })`. The `listTickets` backend handler checks `if (req.user.role === 'member')` and hardcodes `.eq('assignee_id', req.user.id)` regardless of query parameters (tickets.controller.ts lines 137–139). The `assignee_id` filter sent by the frontend is silently ignored — it has no effect on the query.

This is functionally correct (members always get their own tickets) but the frontend sends a filter parameter that does nothing, which is misleading.

**Fix:** Either remove the `assignee_id` filter from the frontend member call (since the backend enforces it anyway), or document the behaviour:
```javascript
// MemberTicketList.jsx — no filter needed; backend enforces assignee_id = req.user.id for members
ticketsApi.list()
```

---

### LOW-03 — `formatHours` in `api.js` returns `—` for `h = 0` (falsy check on numeric 0)

**File:** `frontend/src/lib/api.js` (lines 212–215)

**Description:**
`formatHours` uses `h == null` to guard against null/undefined:
```javascript
export function formatHours(h) {
  if (h == null) return '—'
  return `${parseFloat(h).toFixed(h % 1 === 0 ? 0 : 1)}h`
}
```

This correctly handles `null` and `undefined` but will render `"0h"` for `h = 0`. However `h = 0` is a valid estimated hours value and should display as `"0h"`. This is currently correct. The risk is the `h % 1 === 0` conditional — if `h` is a string `"0.00"` (as Supabase returns DECIMAL columns), `"0.00" % 1` evaluates to `0` in JavaScript, which correctly rounds. No bug currently, but the reliance on JS type coercion is fragile.

**Fix (preventive):** Explicitly parse the value:
```javascript
export function formatHours(h) {
  if (h == null) return '—'
  const parsed = parseFloat(h)
  if (isNaN(parsed)) return '—'
  return `${parsed.toFixed(parsed % 1 === 0 ? 0 : 1)}h`
}
```

---

### LOW-04 — `AddFirm.jsx` and `AddMember.jsx` use hard-coded `ml-[240px]` sidebar offset without responsive classes

**File:** `frontend/src/pages/admin/AddFirm.jsx` (line 50), `frontend/src/pages/admin/AddMember.jsx` (line 53)

**Description:**
Both pages use `ml-[240px]` on the `<main>` element without a responsive breakpoint prefix. Most other admin pages use `ml-0 md:ml-[240px]` to allow the sidebar to collapse on mobile. On small screens, these pages will have a permanent 240px left margin, pushing content off-screen.

```jsx
// AddFirm.jsx line 50 — missing md: breakpoint
<main className="ml-[240px] min-h-screen ...">

// AddMember.jsx line 53 — same issue
<main className="ml-[240px] min-h-screen ...">
```

**Fix:**
```jsx
<main className="ml-0 md:ml-[240px] min-h-screen ...">
```

The same issue applies to `MemberEdit.jsx` line 100 and line 79.

---

### LOW-05 — `overdueTickets` endpoint uses `created_at` instead of `updated_at` for staleness check

**File:** `backend/src/controllers/dashboard.controller.ts` (lines 119–125)

**Description:**
The overdue tickets query filters `created_at < 7 days ago`. This means a ticket that was actively worked on yesterday (updating `updated_at`) but was created 8 days ago will appear as "overdue". A ticket should be considered overdue based on inactivity (`updated_at`), not creation date.

```typescript
const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
const { data } = await supabase
  .from('tickets')
  .select(...)
  .eq('status', 'approved')
  .lt('created_at', sevenDaysAgo)  // should be updated_at
```

**Fix:**
```typescript
.lt('updated_at', sevenDaysAgo)
```

---

## Self-Verification Checklist

- [x] All new backend routes protected with correct middleware — PASS (all routes verified)
- [x] Frontend components use `src/lib/api.js` exclusively — PASS (no direct `fetch` calls found in components)
- [x] TypeScript types imported from `src/types/index.ts` — PASS
- [x] Ticket status transitions follow the correct lifecycle — PASS with exception noted in CRIT-02
- [x] Unhandled promise rejections and missing try/catch — HIGH-02 found
- [x] Design system compliance — LOW-04 found (responsive classes missing)

---

## Verdict: FAIL

**Must fix before merge:** CRIT-01 (committed secrets), CRIT-02 (broken resolve for admins), CRIT-03 (silent delete of non-existent firm), HIGH-02 (unhandled promise rejection), HIGH-03 (ineffective logout), HIGH-04 (dead page registered with wrong component), HIGH-05 (time log on draft tickets).
