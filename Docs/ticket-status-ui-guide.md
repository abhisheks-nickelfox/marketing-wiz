# Ticket Status UI Guide

## Admin — Ticket Detail Page

### Status Badge
Located in the ticket metadata header. Displays the human-readable label with a color dot.

| Raw Value | Displayed As | Badge Color |
|---|---|---|
| `draft` | New | Gray |
| `in_progress` | In Progress | Blue |
| `resolved` | Resolved | Teal |
| `internal_review` | Internal Review | Violet |
| `client_review` | Client Review | Indigo |
| `compliance_review` | Compliance Review | Amber |
| `approved` | Approved | Emerald |
| `closed` | Closed | Dark Emerald |
| `revisions` | Revisions | Orange |
| `discarded` | Discarded | Red |

---

### Quick Actions Panel (Right Column)

The actions shown depend on the current ticket status:

#### Draft (New)
- Edit Ticket
- Regenerate with AI *(only if AI-generated)*
- **Assign & Approve** → moves to `in_progress`
- Discard Ticket → moves to `discarded`

#### In Progress
- Edit Ticket
- Mark as Resolved → opens resolve modal
- **Move Status dropdown** → options: `Revisions`

#### Resolved
- Edit Ticket
- **Move Status dropdown** → options: `Internal Review`, `Revisions`

#### Internal Review
- Edit Ticket
- **Move Status dropdown** → options: `Client Review`, `Revisions`

#### Client Review
- Edit Ticket
- **Move Status dropdown** → options: `Compliance Review`, `Revisions`

#### Compliance Review
- Edit Ticket
- **Move Status dropdown** → options: `Approved`, `Revisions`

#### Approved
- Edit Ticket
- **Move Status dropdown** → options: `Closed`, `Revisions`

#### Revisions
- Edit Ticket
- **Move Status dropdown** → options: `Internal Review`

#### Closed / Discarded
- No actions (read-only)

---

### Move Status Dropdown

- Appears in Quick Actions for any status that has valid next steps
- Shows `Select next status…` as placeholder
- Selecting a value immediately triggers the transition (no confirm button)
- Resets after transition completes
- "Revisions" is always an option at every post-resolve stage — used to send work back

---

## Member — Ticket Detail Page

### Status Badge
Read-only. Shows the human-readable label (same label table as admin).

### Mark as Resolved Button
Appears **only** when:
1. `ticket.status === 'in_progress'`
2. The logged-in user is the ticket's assignee

Opens a modal to add a final comment and confirm total estimated hours before resolving.

### Locked States
Once a ticket moves past `in_progress`, members **cannot**:
- Edit estimated hours
- Add time logs
- Mark as resolved

These statuses lock the member view:
`closed`, `discarded`, `internal_review`, `client_review`, `compliance_review`, `approved`, `revisions`

---

## Firm Detail Page — Stats Bar

Stat badges at the top of the firm's ticket list. Each badge shows the count for that status and is clickable — clicking navigates to the filtered ticket list.

Badges shown (only if count > 0, Total always shown):
`Total` · `New` · `In Progress` · `Resolved` · `Int. Review` · `Client Review` · `Compliance` · `Approved` · `Closed` · `Revisions` · `Discarded`

---

## Ticket List Page — Status Filter

The status filter dropdown includes all 10 statuses:

```
Any Status
New
In Progress
Resolved
Internal Review
Client Review
Compliance Review
Approved
Closed
Revisions
Discarded
```

---

## Color Reference (Tailwind Classes)

```js
draft:             'bg-surface-container-high text-on-surface-variant'
in_progress:       'bg-blue-100 text-blue-700'
resolved:          'bg-teal-100 text-teal-700'
internal_review:   'bg-violet-100 text-violet-700'
client_review:     'bg-indigo-100 text-indigo-700'
compliance_review: 'bg-amber-100 text-amber-700'
approved:          'bg-emerald-100 text-emerald-700'
closed:            'bg-emerald-200 text-emerald-800'
revisions:         'bg-orange-100 text-orange-700'
discarded:         'bg-red-100 text-red-500'
```

Defined in `frontend/src/lib/api.js` → `getStatusBadge(status)`.
