# Ticket Status API Reference

## Endpoints

### Transition Status (Admin Only)
```
PATCH /api/tickets/:id/transition
Authorization: Bearer <admin-token>
```

**Request body:**
```json
{ "status": "internal_review" }
```

**Valid target values:**
`in_progress` · `resolved` · `internal_review` · `client_review` · `compliance_review` · `approved` · `closed` · `revisions`

> `draft`, `discarded` are not valid targets via this endpoint.

**Response 200:**
```json
{ "data": { ...ticket } }
```

> When transitioning to `revisions`, the endpoint also:
> - Increments `tickets.revision_count`
> - Inserts a `log_type = 'revision'` time log with the `change_note` as comment

**Response 400 — invalid transition:**
```json
{ "error": "Cannot transition from 'draft' to 'internal_review'" }
```

**Response 400 — validation failed:**
```json
{ "error": "Validation failed", "details": [...] }
```

---

### Assign & Approve (draft → in_progress)
```
PATCH /api/tickets/:id/assign-approve
Authorization: Bearer <admin-token>
```
```json
{ "assignee_id": "<uuid>", "priority": "normal", "deadline": "2026-04-15" }
```
Sets `status = in_progress`, assigns the ticket to a member.

---

### Mark as Resolved (in_progress → resolved)
```
PATCH /api/tickets/:id/resolve
Authorization: Bearer <member-or-admin-token>
```
```json
{ "final_comment": "Work complete", "estimated_hours": 2.5 }
```
Only the assignee or an admin can call this. Only works when `status = in_progress`.

---

### Discard (draft → discarded)
```
PATCH /api/tickets/:id/discard
Authorization: Bearer <admin-token>
```
Only draft tickets can be discarded.

---

## State Machine (Backend)

Defined in `backend/src/controllers/tickets.controller.ts`:

```typescript
const VALID_TRANSITIONS: Record<string, string[]> = {
  in_progress:       ['revisions'],
  resolved:          ['internal_review', 'revisions'],
  internal_review:   ['client_review', 'revisions'],
  client_review:     ['compliance_review', 'revisions'],
  compliance_review: ['approved', 'revisions'],
  approved:          ['closed', 'revisions'],
  revisions:         ['internal_review'],
};
```

Any transition not listed returns **HTTP 400**.

---

## Frontend API Client

```js
// Transition to a new status (admin only)
ticketsApi.transition(ticketId, 'internal_review')

// Archive / unarchive
ticketsApi.archive(ticketId, true)   // archive
ticketsApi.archive(ticketId, false)  // unarchive
```

Both methods are in `frontend/src/lib/api.js` under `ticketsApi`.

---

## Database

**Table:** `public.tickets`  
**Column:** `status TEXT NOT NULL DEFAULT 'draft'`

**CHECK constraint** (migration 015):
```sql
CHECK (status IN (
  'draft', 'in_progress', 'resolved',
  'internal_review', 'client_review', 'compliance_review',
  'approved', 'closed', 'revisions', 'discarded'
))
```

**Index:**
```sql
CREATE INDEX idx_tickets_status ON public.tickets(status);
```
