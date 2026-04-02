# Ticket Status Workflow

## Overview

MarketingWiz uses a 10-stage ticket lifecycle that tracks work from initial creation through client delivery and final closure. Admin/PM controls all transitions after a member resolves their work.

---

## Status Reference

| Status | Label | Who Sets It | Color |
|---|---|---|---|
| `draft` | New | System (on create/process) | Gray |
| `in_progress` | In Progress | Admin (Assign & Approve) | Blue |
| `resolved` | Resolved | Member (Mark as Resolved) | Teal |
| `internal_review` | Internal Review | Admin (dropdown) | Violet |
| `client_review` | Client Review | Admin (dropdown) | Indigo |
| `compliance_review` | Compliance Review | Admin (dropdown) | Amber |
| `approved` | Approved | Admin (dropdown) | Emerald |
| `closed` | Closed | Admin (dropdown) | Dark Emerald |
| `revisions` | Revisions | Admin (dropdown) | Orange |
| `discarded` | Discarded | Admin (Discard button) | Red |

---

## Workflow Diagram

```
[draft / New]
     │
     ▼  Admin: Assign & Approve
[in_progress / In Progress]
     │
     ▼  Member: Mark as Resolved
[resolved / Resolved]
     │
     ▼  Admin dropdown
[internal_review / Internal Review]
     │
     ▼  Admin dropdown
[client_review / Client Review]
     │
     ▼  Admin dropdown
[compliance_review / Compliance Review]
     │
     ▼  Admin dropdown
[approved / Approved]
     │
     ▼  Admin dropdown
[closed / Closed]  ← terminal


At any post-resolved stage, Admin can send back:
[any] ──► [revisions / Revisions] ──► [internal_review]
```

---

## Valid Transitions (State Machine)

```
From              → To (Admin Dropdown Options)
─────────────────────────────────────────────
in_progress       → revisions
resolved          → internal_review, revisions
internal_review   → client_review, revisions
client_review     → compliance_review, revisions
compliance_review → approved, revisions
approved          → closed, revisions
revisions         → internal_review
```

`draft` transitions only via dedicated buttons (Assign & Approve, Discard).  
`closed` and `discarded` are terminal — no further transitions.

---

## Revision Cycle Tracking

Each time a ticket is sent to `revisions`, a new revision cycle begins:

- `tickets.revision_count` — incremented on every `→ revisions` transition
- `time_logs.revision_cycle` — every log is tagged with the current revision cycle (0 = initial work)
- A `log_type = 'revision'` milestone log is auto-inserted when admin sends to revisions, storing the admin's change note as the `comment`

### Log Timeline View
Cycle 0 logs = Initial Work (before first resolve)
Cycle 1 logs = Revision 1 (after first revisions transition)
Cycle N logs = Revision N (after Nth revisions transition)

The revision milestone log (log_type = 'revision') is shown as a section header in the UI with the admin's note. It is not counted in time totals.

---

## Role Permissions

### Member
- Can only see status as **read-only** badge
- Sees human label (e.g., "In Progress") not raw value
- "Mark as Resolved" button appears **only** when `status === 'in_progress'` and user is the assignee
- Cannot edit ticket or log time once status moves past `in_progress`

### Admin / PM
- Controls all transitions via the **"Move Status" dropdown** in the Quick Actions panel on Ticket Detail
- Can use Assign & Approve (`draft` → `in_progress`)
- Can Discard (`draft` → `discarded`)
- Can Mark as Resolved on behalf of a member (`in_progress` → `resolved`)
- All post-resolved transitions via dropdown

---

## Member Interaction Lock

Members are locked out of editing and time logging once the ticket leaves `in_progress`:

```
Locked statuses for members:
  closed, discarded, internal_review, client_review,
  compliance_review, approved, revisions
```

---

## Archive vs Discard vs Closed

| Action | When | Effect |
|---|---|---|
| **Discard** | Draft tickets only | Sets `status = discarded`. Permanent, reversible only by deletion |
| **Archive** | Any ticket, any status | Sets `archived = true`. Ticket hidden from default list but data preserved |
| **Close** | After `approved` stage | Sets `status = closed`. Terminal status in the review workflow |

---

## Files Changed

| File | Change |
|---|---|
| `database/migrations/015_expand_ticket_status.sql` | Expanded CHECK constraint from 4 to 10 statuses; renamed `approved` → `in_progress` for existing rows |
| `backend/src/types/index.ts` | `TicketStatus` type updated |
| `backend/src/controllers/tickets.controller.ts` | `assignAndApprove` sets `in_progress`; `resolveTicket` guards on `in_progress`; added `transitionTicket` handler with `VALID_TRANSITIONS` map |
| `backend/src/routes/tickets.ts` | Registered `PATCH /api/tickets/:id/transition` (admin only) |
| `frontend/src/lib/api.js` | `getStatusBadge` expanded; added `ticketsApi.transition()` |
| `frontend/src/pages/admin/TicketDetail.jsx` | Added "Move Status" dropdown, `STATUS_LABELS`, `handleTransition`; updated `isClosed` |
| `frontend/src/pages/member/TicketDetail.jsx` | Updated `isClosed`, resolve button condition, `STATUS_LABELS` |
| `frontend/src/pages/admin/FirmDetail.jsx` | Stats bar updated for all 10 statuses |
| `frontend/src/pages/admin/TicketList.jsx` | Status filter dropdown updated; `STATUS_LABELS` added |
