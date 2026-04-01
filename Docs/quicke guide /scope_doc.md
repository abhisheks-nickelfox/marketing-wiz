# Workflow & Scope Document

**Project:** Transcript-to-Ticket Management Platform
**Document type:** Functional Scope & User Workflow
**Version:** 1.0

---

## Overview

The platform serves two distinct user roles — **Admin** and **Team Member** — who share the same application interface but see different navigation options, analytics, and functionality based on their role. The core purpose of the platform is to enable admins to convert meeting transcripts into actionable project tickets via AI processing, and allow team members to manage, log time on, and resolve those tickets.

---

## 1. Authentication

Both user types access the platform through a shared login screen. Upon successful login, the system identifies the user's role and renders the appropriate dashboard and sidebar navigation.

---

## 2. Admin Panel

### 2.1 Sidebar Navigation

The admin sidebar provides access to the following sections:

- **Dashboard** — Analytics overview
- **Users** — Manage team members
- **Tickets** — View all tickets across firms
- **Transcripts** — Import and process Fireflies transcripts
- **Firms** — Manage client firms
- **Logout**

---

### 2.2 Admin Dashboard

The dashboard presents a high-level analytics summary for the admin. The following metrics are displayed:

| Metric | Description |
|---|---|
| Total firms | Number of client firms registered |
| Total tickets | All tickets generated across all firms |
| Pending tickets | Tickets not yet resolved |
| Total team | Number of team members in the system |
| Recent transcripts | Latest transcripts synced from Fireflies |

---

### 2.3 Transcript Workflow

This is the primary workflow for the admin user. It covers the end-to-end flow from transcript selection through AI processing to ticket approval and assignment.

#### Step 1 — Transcript list

The admin navigates to the Transcripts section from the sidebar. All transcripts synced from Fireflies are displayed as a list. Each entry shows relevant metadata (e.g. meeting name, date).

#### Step 2 — Open processing dialog

Clicking any transcript opens a dialog box containing the following inputs:

- **Select firm** — dropdown to choose the client firm this transcript belongs to
- **Select prompt** — dropdown to select the AI processing type (e.g. PM, DevOps, Design, etc.)
- **Notes field** — a text or voice input allowing the admin to add extra context or instructions that will be passed to the AI alongside the transcript
- **Process button** — triggers the AI processing pipeline

#### Step 3 — AI processing

On clicking Process, the system sends the transcript content, selected prompt type, and notes to the AI engine. The AI analyzes the transcript and generates a set of tickets. These tickets are automatically attached to the selected firm.

#### Step 4 — Ticket review

Once processing completes, the generated tickets are displayed in a review list. Each ticket presents three actions:

**Approve**
The admin confirms the ticket is valid and accurate. Clicking Approve opens a confirmation dialog where the admin can:
- Confirm the ticket
- Assign the ticket to a specific team member

**Edit**
The admin can modify the ticket content — title, description, or any other text fields — before approving. After making changes the ticket returns to the review list.

**Recreate**
If the ticket is not satisfactory, the admin can invoke the AI again with an additional prompt (e.g. "You missed the client deadline requirement"). The AI refines and regenerates the ticket, which then reappears in the review list for re-evaluation.

#### Step 5 — Ticket assignment

After approval, the ticket is formally assigned to a team member and becomes visible in that member's ticket queue.

---

## 3. Team Member Panel

### 3.1 Sidebar Navigation

The team member sidebar is limited to:

- **Dashboard** — Personal analytics
- **Tickets** — Assigned ticket queue
- **Logout**

---

### 3.2 Team Member Dashboard

Upon login, the team member sees a personal analytics overview:

| Metric | Description |
|---|---|
| Total assigned tickets | All tickets assigned to this member |
| Resolved tickets | Tickets marked as resolved |
| Pending tickets | Tickets still in progress |
| Total time spent | Cumulative logged hours across all tickets |

---

### 3.3 Ticket Workflow

#### Step 1 — Ticket list

The team member navigates to Tickets from the sidebar. All tickets assigned to them are listed, showing basic ticket information.

#### Step 2 — Ticket detail page

Clicking a ticket opens the full ticket detail page, which displays:

- **Firm name** — the client this ticket belongs to
- **Original estimate** — the time estimate set during ticket creation
- **Time log stack** — a chronological record of all time entries the member has logged on this ticket
- **Personal estimate input** — the member can enter their own time estimate
- **Time log entry** — the member can log hours worked for a specific day along with a mandatory comment

#### Step 3 — Logging work time

The team member can add multiple time log entries to a ticket. Each entry requires:

- Number of hours worked
- A comment describing the work done

All entries accumulate into a visible stack on the ticket, showing a full history of work contributions on that ticket over time.

#### Step 4 — Resolving a ticket

When the work is complete, the team member clicks **Mark as resolved**. A confirmation dialog appears containing:

- Total time spent (auto-calculated from all log entries)
- A comment field for a final resolution note
- **Cancel** — dismisses the dialog, ticket remains open
- **Resolve** — confirms resolution; the ticket is marked as resolved and removed from the active queue

---

## 4. Scope Summary

### In scope

- Role-based login and navigation (Admin and Team Member)
- Admin dashboard with firm, ticket, team, and transcript analytics
- Fireflies transcript sync and listing
- Transcript processing dialog (firm selection, prompt selection, notes)
- AI-powered ticket generation from transcripts
- Ticket review flow: approve, edit, recreate with additional prompt
- Ticket assignment to team members on approval
- Team member dashboard with personal analytics
- Ticket list and detail view for team members
- Time logging per ticket with comments (multi-entry stack)
- Ticket resolution flow with total time and final comment

### Out of scope (unless added)

- Fireflies integration setup and authentication (assumed pre-configured)
- AI model selection or configuration by end users
- Billing or subscription management
- Real-time notifications or email alerts
- Mobile native application (assumed web-based)

---

## 5. Role Comparison

| Feature | Admin | Team Member |
|---|---|---|
| Dashboard analytics | Firm-wide | Personal |
| Sidebar items | 6 | 3 |
| Transcript access | Full | None |
| Ticket creation | Via AI (transcript) | None |
| Ticket review & approval | Yes | No |
| Ticket assignment | Yes (assigns others) | No |
| View assigned tickets | Yes | Yes |
| Log time on ticket | No | Yes |
| Resolve ticket | No | Yes |

---

*Document prepared for client review. All flows and features described herein represent the agreed functional scope and are subject to revision based on client feedback.*
