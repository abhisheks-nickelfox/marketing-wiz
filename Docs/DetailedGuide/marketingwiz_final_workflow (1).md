# MarketingWiz
## Final Workflow Documentation
### Version 5.0 — All Constraints Applied

---

## 1. Authentication & RBAC

Single login panel for both admin and team members. Role determined server-side on login.

```
Roles:
  admin   → Dashboard, Transcripts, Firms, Tickets, Team, Logout
  member  → Dashboard, Tickets, Logout only
```

All routes protected by middleware. Frontend redirects to correct dashboard based on role. Every API endpoint checks role before responding.

---

## 2. Admin Workflow

---

### 2.1 Admin Login

- Single login page (email + password)
- Server checks role → redirects to `/admin/dashboard`

---

### 2.2 Admin Dashboard (`/admin/dashboard`)

**Stat cards:**

| Card | Value | On Click |
|---|---|---|
| Total firms | Count of active firms | → Firms list |
| Total tickets | All tickets across all firms | → All tickets list |
| Pending tickets | Status = draft / pending | → Filtered tickets |
| Approved tickets | Status = approved | → Filtered tickets |
| Total team members | Active users with role = member | → Team list |

**Recent transcripts panel:**
- Shows last 5 transcripts synced from Fireflies
- Columns: Call title · Date · Participants
- Each row has a **Process** button → navigates to `/admin/transcripts` and opens that transcript inline

---

### 2.3 Admin Sidebar Navigation

```
MarketingWiz
─────────────
Dashboard
Transcripts
Firms          → direct navigation to Firms list
Tickets        → direct navigation to All Tickets master list
Team           → direct navigation to Team list
─────────────
Logout
```

All three master views (Firms, Tickets, Team) are reachable directly from both the sidebar and the dashboard stat cards. These are separate navigation paths — independent of the transcript processing flow.

---

### 2.4 Transcripts (`/admin/transcripts`)

#### How Fireflies integration works

The backend runs a scheduled sync job every 15 minutes using the Fireflies GraphQL API. Every new call is fetched and stored in the local database on first sync. This means:

- The transcript list always shows your own stored data — never a live Fireflies call
- Processing reads transcript text from local DB — no Fireflies API call at processing time
- Regenerating tickets reads transcript from local DB — zero additional Fireflies API calls
- If you switch providers (Gong, Otter, Zoom), only the sync adapter changes — everything downstream is untouched

#### Transcript list

Table of all synced transcripts, sorted by call date descending (newest first).

**Columns:**

| Column | Detail |
|---|---|
| Call title | From Fireflies metadata |
| Call date | Date and time of call |
| Duration | Length in minutes |
| Participants | Names from Fireflies |
| Action | **Process** button per row |

> No status column. Archive is a secondary link per row — archived transcripts are hidden from the list (toggle "Show archived" to reveal them).

---

#### Processing panel (inline expansion — same page, no navigation)

When admin clicks **Process** on any transcript row, a processing panel **expands inline below that row on the same page**. This is not a new page or a modal — it is an in-place expansion of the transcript row. No navigation occurs at this point.

The panel contains **3 fields:**

**Field 1 — Firm selection** (required)
- Dropdown of all active firms
- Process button stays disabled until this is selected

**Field 2 — Prompt type** (required)
- Dropdown filtered by selected firm
- Options: Project Management · Campaigns · Content · (any custom types admin created)
- Process button stays disabled until this is selected

**Field 3 — Notes** (optional)
- Free text area — additional context merged into the AI prompt
- Example: "Focus only on HubSpot tasks. Ignore the social media discussion."

**Process button behaviour:**
- Disabled until both Firm + Prompt type are selected
- On click → AI processes: transcript text (from local DB) + notes → returns structured ticket JSON
- Loading state shown while AI runs
- On completion → **page redirects to** `/admin/firms/:firmId` (POST-PROCESSING redirect only — this is not the same as navigating to firms from the sidebar)
- Firm detail page opens showing the newly generated ticket cards

---

### 2.5 Firms (`/admin/firms`)

#### Firms list

Reachable from: sidebar Firms link · dashboard Total Firms card.

Table or cards showing each active firm:
- Firm name
- Total tickets
- Pending ticket count
- Last activity date

**Click firm name → goes directly to Firm detail page.** This is a direct navigation, separate from the post-processing redirect.

---

#### Firm detail page (`/admin/firms/:firmId`)

This page is reached two ways:
1. **After transcript processing** — automatic redirect after AI generates tickets
2. **Direct navigation** — clicking a firm from the Firms list

**Firm header:**
- Firm name · Contact name · Date added · Default prompt type

**Ticket list:**
All tickets generated from processing sessions for this firm, shown as cards. **Ticket actions (edit, regenerate, assign & approve, discard) are only available from this page — not from the All Tickets master list.**

---

#### Ticket card — draft state

When a ticket is first generated it is in draft. The card shows:

| Field | Detail |
|---|---|
| Title | Ticket title |
| Type badge | task / design / development / account management |
| Priority badge | low / normal / high / urgent |
| Status badge | draft |

> No assignee field on the draft card. Assignee name only appears after the ticket is approved.

**Actions available on a draft ticket:**
- Edit
- Regenerate
- Assign & Approve
- Discard

---

#### Ticket card — approved state

After admin completes the Assign & Approve flow, the card updates to:

| Field | Detail |
|---|---|
| Title | Ticket title |
| Type badge | task / design / development / account management |
| Priority badge | low / normal / high / urgent |
| Assignee | Team member name (now visible) |
| Status badge | approved |

**Actions available on an approved ticket:**
- Edit (with mandatory change note)

**Actions hidden on an approved ticket:**
- Regenerate — permanently hidden
- Assign & Approve — permanently hidden
- Discard — permanently hidden

---

#### Ticket actions — full rules

| Action | When available | Behaviour |
|---|---|---|
| **Edit** | Always — draft AND approved | Inline edit of all fields. If ticket is already approved, a mandatory change note field appears. Admin must enter reason. Note saved and shown to assigned user as "Updated by admin: [note]". |
| **Regenerate** | Draft only — permanently hidden after approve | Opens regenerate modal. |
| **Assign & Approve** | Draft only — permanently hidden after approve | Opens Assignment Dialog (two-step flow — see below). |
| **Discard** | Draft only — permanently hidden after approve | Removes ticket from active list. |

**Lock rules summary:**

```
DRAFT state:
  Edit            → available
  Regenerate      → available
  Assign & Approve → available
  Discard         → available

APPROVED state:
  Edit            → available (change note required)
  Regenerate      → hidden permanently
  Assign & Approve → hidden permanently
  Discard         → hidden permanently
  Assignee name   → now visible on card
```

---

#### Two-step Assign & Approve flow

**Step 1 — Admin clicks "Assign & Approve" on the draft ticket card**
- Opens Assignment Dialog (modal overlay)

**Step 2 — Assignment Dialog contains:**

| Field | Detail |
|---|---|
| Assignee dropdown | Required — lists all active team members |
| Cancel button | Closes dialog, ticket card unchanged, remains draft |
| Final Approve button | Enabled only when assignee is selected |

> Estimated time is NOT in this dialog. Estimated time is entered by the team member only, on their ticket detail page.

**Final Approve button logic:**
```
Assignee not selected  → Final Approve = disabled
Assignee selected      → Final Approve = enabled
On Final Approve click → dialog closes
                       → assignee saved to ticket
                       → status → approved
                       → assignee name appears on ticket card
                       → ticket immediately visible to assigned user
                       → Regenerate, Assign & Approve, Discard all hidden permanently
```

---

#### Regenerate modal (draft tickets only)

Opens as an overlay modal containing:

1. **Original ticket** — read-only (title, description, type, priority as first generated by AI)
2. **Original transcript** — pulled from local DB (no Fireflies API call)
3. **Additional instruction** — free text input
   - Example: "Make this specifically about the HubSpot email workflow, not the landing page"
4. **Regenerate button** → AI re-runs with original prompt + appended instruction → ticket card updates in place → modal closes → ticket remains in draft

---

### 2.6 All Tickets (`/admin/tickets`)

Reachable from: sidebar Tickets link · dashboard Total/Pending/Approved ticket cards.

Master list of every ticket across all firms. **Read-only view — no ticket actions available here.** To take actions (edit, regenerate, assign & approve, discard), admin must navigate to the specific firm detail page.

**Columns:**
- Ticket title
- Firm name
- Assigned to
- Type
- Priority
- Estimated time (entered by user)
- Time spent (sum of user logs)
- Status
- Created date

**Filters:** by firm · by assignee · by status · by type · by priority

---

### 2.7 Team (`/admin/team`)

Reachable from: sidebar Team link · dashboard Total Team Members card.

#### Team list

| Column | Detail |
|---|---|
| Name | |
| Email | |
| Total assigned tickets | |
| Pending | Open / in-progress |
| Resolved | Completed |
| Joined date | |
| Action | **View** button |

#### User detail page (`/admin/team/:userId`)

**User info:** Name · Email · Role · Date joined

**Stats row:**
- Total assigned tickets
- Pending tickets
- Resolved tickets

**Tickets breakdown table:**

| Column | Detail |
|---|---|
| Ticket title | |
| Firm name | |
| Priority | |
| Estimated time | As entered by the user |
| Time spent | Calculated from user's log entries |
| Status | |

Clicking a ticket row opens a **read-only view** of that ticket. No actions available from this view — admin must go to the firm detail page to take action.

**Firms involved:**
List of all firms whose tickets are assigned to this user, with ticket count per firm.

---

## 3. User (Team Member) Workflow

---

### 3.1 User Login

- Same login page as admin
- Server checks role = member → redirects to `/dashboard`

---

### 3.2 User Dashboard (`/dashboard`)

| Card | Value |
|---|---|
| Total assigned tickets | All tickets assigned to this user |
| Pending tickets | Status = draft / in-progress |
| Total time spent | Sum of all log entries across all tickets |

No access to firms, transcripts, team, or other users. RBAC enforced on every route and API call.

---

### 3.3 User Sidebar Navigation

```
MarketingWiz
─────────────
Dashboard
Tickets
─────────────
Logout
```

---

### 3.4 Tickets (`/tickets`)

List of all tickets **where assignee = current logged-in user only**. Users cannot see or access tickets assigned to other team members.

**Columns:**
- Ticket title
- Firm name
- Priority
- Estimated time
- Time spent
- Status

Click any ticket → opens ticket detail page.

---

### 3.5 Ticket Detail Page (`/tickets/:ticketId`)

#### Section 1 — Read-only ticket info

- Title · Firm name · Type badge · Priority badge
- Description
- Current status (draft / in-progress / resolved)

If admin edited an approved ticket and left a change note, it appears here:
```
Updated by admin [date]: "Scope changed — focus on email workflow only"
```

---

#### Section 2 — Estimated time entry

First time user opens the ticket, this field appears:

```
Estimated time to complete this ticket:  [ ___ hours ]   [Save]
```

**On Save:**
- Estimate stored in DB against this ticket
- A log entry is automatically created: `"Estimated time set: X hours"` with timestamp
- Admin can now see the estimated time on their All Tickets and Team → User detail views
- One-time entry per ticket — updating it creates a new log entry recording the change

> This is entered by the team member only. Admin does not set or override the estimated time.

---

#### Section 3 — Time log panel

User logs time worked in partial sessions, as many times as needed.

**Add log form (inline):**
```
Hours spent this session:  [ ___ ]
Comment:                   [ _________________________ ]
                           [ + Add Log ]
```

**Rules:**
- Each submission appends a new log entry — never overwrites
- Past log entries cannot be edited after saving
- Comment is required alongside hours

**Log history:**

```
Date          Hours     Comment
──────────────────────────────────────────────────────
12 Mar         2h       Initial research and competitor review
13 Mar         1.5h     First draft of landing page copy
14 Mar         1h       Revisions based on client feedback
──────────────────────────────────────────────────────
Total spent:   4.5h     (Estimated: 5h)
```

**Total time spent** = sum of all log entries, calculated live.

---

#### Section 4 — Resolution

When user is ready to submit as complete, they click **Mark as Resolved**.

**Resolution modal opens:**

| Field | Detail |
|---|---|
| Estimated time | Pre-filled from earlier entry, editable |
| Total time spent | Read-only — calculated from all logs |
| Final comment | Optional summary note |
| **Confirm Resolved** button | Submits resolution |

**On Confirm:**
- Ticket status → `resolved`
- Final log entry auto-created: `"Ticket resolved. Total time: X hours."`
- Ticket moves to resolved on user dashboard
- Admin sees updated status, total time, and full log history immediately

> The resolution modal does not loop back to the estimated time entry. It is a forward-only action.

---

## 4. Complete Business Rules Reference

| Rule | Detail |
|---|---|
| Processing panel is inline | Expands on the same page below the transcript row — no page navigation |
| Post-processing redirect is separate from sidebar nav | Redirect after AI processing goes to /admin/firms/:firmId — this is different from clicking Firms in the sidebar |
| Transcript list has no status column | Archive is a secondary link only |
| No Fireflies calls after initial sync | Processing and regenerating both read from local DB |
| Ticket card shows assignee only after approve | Draft card: Title, Type, Priority, Status only |
| Regenerate — draft only | Permanently hidden after approve |
| Assign & Approve — draft only | Permanently hidden after approve |
| Discard — draft only | Permanently hidden after approve |
| Edit — always available | Before and after approval |
| Post-approval edit requires change note | Note is shown to the assigned user on their ticket page |
| Assignment Dialog — assignee only | No estimated time in this dialog |
| Estimated time set by user only | Team member enters it on their ticket detail page — admin cannot set or override it |
| Final Approve requires assignee | Final Approve button disabled until assignee is selected in dialog |
| User ticket list — assigned tickets only | Filtered to tickets where assignee = current user |
| All Tickets master list — read-only | No ticket actions from this view — actions only on firm detail page |
| Team → User detail — read-only | No ticket actions from this view |
| Logs are append-only | Users cannot edit or delete past log entries |
| Estimate triggers first log | Saving estimated time auto-creates first log entry |
| Total time = sum of logs | Never manually entered — always calculated |
| Resolution modal is forward-only | Does not loop back to estimated time entry |

---

## 5. Database Core Tables

```sql
users
  id UUID PK
  name VARCHAR
  email VARCHAR UNIQUE
  role VARCHAR          -- 'admin' | 'member'
  created_at TIMESTAMP

firms
  id UUID PK
  name VARCHAR
  contact_name VARCHAR
  contact_email VARCHAR
  default_prompt_id UUID FK → prompts
  created_at TIMESTAMP

transcripts
  id UUID PK
  provider_id VARCHAR    -- Fireflies transcript ID
  provider VARCHAR       -- 'fireflies'
  title VARCHAR
  call_date TIMESTAMP
  duration_sec INTEGER
  participants JSONB
  raw_transcript TEXT    -- full speaker-labelled text, stored on first sync
  firm_id UUID FK → firms (nullable, set when processed)
  archived BOOLEAN DEFAULT false
  created_at TIMESTAMP

prompts
  id UUID PK
  name VARCHAR
  type VARCHAR           -- 'pm' | 'campaigns' | 'content' | custom
  system_prompt TEXT
  is_active BOOLEAN
  firm_id UUID FK → firms (nullable = global)

processing_sessions
  id UUID PK
  transcript_id UUID FK → transcripts
  firm_id UUID FK → firms
  prompt_id UUID FK → prompts
  text_notes TEXT
  ai_raw_output JSONB
  created_by UUID FK → users
  created_at TIMESTAMP

tickets
  id UUID PK
  session_id UUID FK → processing_sessions
  firm_id UUID FK → firms
  assignee_id UUID FK → users (nullable — set at approve time)
  title VARCHAR
  description TEXT
  type VARCHAR           -- 'task' | 'design' | 'development' | 'account_management'
  priority VARCHAR       -- 'low' | 'normal' | 'high' | 'urgent'
  status VARCHAR         -- 'draft' | 'approved' | 'discarded' | 'resolved'
  change_note TEXT       -- populated when admin edits after approval
  estimated_hours DECIMAL(5,2)  -- set by user (team member) only
  ai_generated BOOLEAN DEFAULT true
  edited BOOLEAN DEFAULT false
  created_at TIMESTAMP
  updated_at TIMESTAMP

time_logs
  id UUID PK
  ticket_id UUID FK → tickets
  user_id UUID FK → users
  hours DECIMAL(5,2)
  comment TEXT
  log_type VARCHAR       -- 'estimate' | 'partial' | 'final'
  created_at TIMESTAMP
```

---

## 6. Implementation Priority

| # | Feature | Phase |
|---|---|---|
| 1 | Auth + RBAC (single login, role redirect) | 1 |
| 2 | Fireflies sync job → local transcript table | 1 |
| 3 | Transcript list (title · date · duration · participants, no status column) | 1 |
| 4 | Inline processing panel (expands on same page, firm + prompt + notes) | 1 |
| 5 | AI processor → structured ticket generation | 1 |
| 6 | Post-processing redirect to firm detail | 1 |
| 7 | Ticket card — draft state (4 fields, no assignee) | 1 |
| 8 | Edit (always) + change note if approved | 1 |
| 9 | Regenerate modal (draft only, reads local DB) | 1 |
| 10 | Two-step Assign & Approve (dialog with assignee only) | 1 |
| 11 | Ticket card — approved state (shows assignee, hides regen/assign/discard) | 1 |
| 12 | Discard (draft only) | 1 |
| 13 | User ticket list (filtered to assignee = current user) | 1 |
| 14 | Ticket detail page (read-only info + change note display) | 1 |
| 15 | Estimated time entry → auto first log (user only) | 1 |
| 16 | Time log panel (append-only, running total) | 1 |
| 17 | Resolution modal (forward-only, no loop back) | 1 |
| 18 | Admin dashboard stat cards | 2 |
| 19 | All Tickets master list (read-only, no actions) | 2 |
| 20 | Team list + user detail (read-only ticket views) | 2 |
| 21 | Firms list (direct nav, separate from redirect) | 2 |
| 22 | Recent transcripts panel on dashboard | 2 |
| 23 | Archive transcript toggle | 2 |
