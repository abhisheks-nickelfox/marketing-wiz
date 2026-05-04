# AI Wealth Connections — Development Timeline

7-week plan · Week 1 & 2 complete · Week 3 in progress from 28 Apr 2026 · All upcoming dates may vary as per client direction

| Stat | Value |
|------|-------|
| Weeks complete | 2 |
| Weeks remaining | 5 |
| Critical gaps | 13 |
| Extended scope | May vary |

---

## Week 1 & 2 — User management, onboarding & dashboard

**Status:** Completed  
**Dates:** 13 Apr – 24 Apr 2026  
**Focus:** AWS setup · Project onboarding · Team admin · User invite & edit · Dashboard overview

### Features Completed

**AWS setup & project onboarding**
- AWS environment provisioned
- Infrastructure planning and environment configuration
- CI/CD pipeline initialised
- Repository structure and branching strategy set
- Environment variables and secrets management configured
- Development, staging and production environments established
- Backend server on AWS via reverse proxy
- Frontend deployed on server
- Team access provisioned for all members
- Technical documentation and AWS documentation finalised

**Database architecture & auth**
- Database architecture and schemas designed per RBAC
- first_name, last_name, phone_number columns added with migration
- avatar_url column added with avatars storage bucket
- Skills table — user-defined skill model with experience
- User status lifecycle — INVITED, ACTIVE, DISABLED
- Rate amount column added on user invites
- DTO-based validation for auth, project and user modules
- Unit test cases for login, onboarding and validation flows

**Login & authentication**
- Frontend login pages designed as per Figma
- Login journey with backend setup
- Forgot password journey with email notification
- SMTP email server setup
- Status-based access control — disabled users restriction
- Role constants — Admin, PM, Member — standardised

**Onboarding journey**
- Multi-step onboarding journey — frontend + backend
- Animated stepper component in onboarding flow
- Step 4 — Skills feature (user-driven model)
- Skill + experience validation and mapping
- First-time user guide for dashboard
- FileUpload — drag-and-drop image upload
- ImageCropModal — crop image before saving
- PhoneInput — country code selection

**User management & team list**
- User list page as per Figma
- Invite team form — frontend + backend + database
- PM role added to invite flow
- Password removed from new user add flow
- Rate amount on user invites
- User status lifecycle enforced across list and settings
- Skill + experience validation on backend
- User settings — name, email, photo, role, cost, skills, extra permissions

**Dashboard UI**
- Welcome greeting + task count overview
- Total Tasks donut chart with status segments
- Your Focus Today panel
- Quick Links — Add a Client, View Timesheets, Create a Project, Manage Transcripts
- Project Summary table
- Date range filter tabs + Filter by Firm + Filter by Status
- Tasks / Timesheets / Transcripts tab bar
- Global header — search, timer widget, user avatar dropdown

### Daily Work Log — Week 1 (13 Apr – 17 Apr 2026)

| Day | Hours | Work Done |
|-----|-------|-----------|
| Mon, 13 Apr | 7 hrs — R&D | Technical documentation and feasibility study. AWS documentation researched and finalised. Pre-team meeting to finalise docs before client meeting. |
| Tue, 14 Apr | 5 hrs Dev · 1 hr Meeting | Database architecture and schemas designed per RBAC. Frontend login pages and dashboard initiated. Role and status constants added. Discussion with team on SMTP server and login flow. |
| Wed, 15 Apr | 8 hrs — Dev | Login journey built with backend setup. first_name, last_name, phone_number columns added. avatar_url column and avatars storage bucket created. FileUpload, ImageCropModal and PhoneInput components implemented. |
| Thu, 16 Apr | 8 hrs — Dev | Invite team form built — frontend, backend and database. Multi-step onboarding journey developed. SMTP email setup completed. First-time user guide for dashboard added. |
| Fri, 17 Apr | 8 hrs — Dev | Frontend built as per Figma for onboarding and user list. Forgot password journey implemented with email notification. |

### Daily Work Log — Week 2 (20 Apr – 24 Apr 2026)

| Day | Hours | Work Done |
|-----|-------|-----------|
| Mon, 20 Apr | 6.5 hrs Dev · 1.5 hrs Meeting | Bug fixes on form — frontend, backend and database schema. PM role added and password removed from new user flow. Production bugs fixed on frontend. Repo created for server deployment and frontend set up on server. Pre-meeting and client call. |
| Tue, 21 Apr | 7 hrs Dev · 1 hr Meeting | Skills section moved from user creation into onboarding Step 4. User-driven skill model implemented — frontend, backend APIs and database schema updated. Data consistency verified after migration. Feature discussion based on client call. |
| Wed, 22 Apr | 6.5 hrs Dev · 1.5 hrs Meeting | User management feature continued. Production environment setup initiated on AWS — infrastructure planning, environment configuration and deployment strategy. Pre-meeting and session with design team. |
| Thu, 23 Apr | 8.7 hrs — Dev | Authentication and onboarding flow improved with DTO-based validation. User status lifecycle standardised. Animated stepper added. Status inconsistency between user list and settings fixed. Status-based access control implemented. Unit tests added for login, onboarding and validation. |
| Fri, 24 Apr | 8 hrs — Dev | Backend server deployed on AWS via reverse proxy. Skill and experience validation issues fixed. Rate amount added on user invites. Backend validation for user management finalised. |

---

## Week 3 — Admin settings, onboarding & firm management

**Status:** In progress  
**Dates:** 28 Apr – 2 May 2026 *(may vary as per client changes)*  
**Focus:** Settings (Personal · Org · Project) · Add Firm wizard · Firm overview & communications

### Planned Features

**Personal info (Settings)**
- [ ] Name, email, photo upload
- [ ] Change Password
- [ ] Role display — read-only for logged-in user
- [ ] 2FA setup wizard — Choose Method → Verify Code
- [ ] Skills section
- [ ] Settings tab bar

**Organisation info**
- [ ] Logo upload
- [ ] Skill Management table — type tag, description, members, usage count
- [ ] Add a Skill slide-out — type, description, colour picker, team picker
- [ ] Delete icon per skill row

**Project settings**
- [ ] Task Type Management table — type tag, description, default team, usage
- [ ] Create A Task Type slide-out — name, description, colour, default team
- [ ] Delete icon per row

**Add a firm (3-step wizard)**
- [ ] Step 1 — Firm details: name, location, website, logo, description
- [ ] Step 2 — Primary contact: Name, Role, Email, Phone
- [ ] Step 3 — Choose Account Manager
- [ ] Step progress indicator
- [ ] New firm appears in sidebar

**Firm overview**
- [ ] Firm logo + name + About text
- [ ] Actions — Edit, Delete
- [ ] Communications tab — threaded chat with reply composer
- [ ] Quick Links — DropBox, Reports, HubSpot
- [ ] Right sidebar — Location, Website, Point of Contact, Accounts Manager
- [ ] Tab bar — Overview / Client Requests / Projects / Time Reports / Notes

**Firm sidebar navigation**
- [ ] Alphabetical firm list
- [ ] + Add a firm pinned at top
- [ ] Active firm highlighted
- [ ] Expand/collapse toggle

---

## Week 4 — Project management & task workflows

**Status:** Upcoming  
**Dates:** 5 May – 9 May 2026 *(may vary as per client changes)*  
**Focus:** Project Summary · Project detail · Firm-scoped projects · My Tasks · Task status flow

### Planned Features

**Global Project Summary**
- [ ] Status-grouped sections — To Do, Assigned, In Progress, Internal Review
- [ ] Project row: name + tags, client, assignees, due date, priority, status
- [ ] Context menu — Edit, Delete, Convert to Template, Export
- [ ] Filter panel — status + firm list

**Create a project**
- [ ] Template selector
- [ ] Name + description
- [ ] Project type + Tasks/Subtask type
- [ ] Start + End date pickers
- [ ] Assignee multi-picker + Priority
- [ ] File upload area

**Project detail view**
- [ ] Header — name, created by, Actions
- [ ] Assignees, Status, Priority, Due date
- [ ] Task Type tags + Timesheet entry row
- [ ] Description + Attachments + Custom Fields
- [ ] Sub Tasks list

**Activity panel**
- [ ] Recent / Files & Links / Notes tabs
- [ ] Chat thread — sender, timestamp, messages
- [ ] Message composer + hover toolbar

**My Tasks**
- [ ] Tasks grouped by status for current user
- [ ] Left quick-filter sidebar — To do, Assigned to me, Today Due, Overdue, Active, Urgent, Blocked, Revisions, Closed, Complete
- [ ] Row hover tooltip — Project, Client, Assigned by
- [ ] Filter panel — Status + Firm

**Task status & timesheet**
- [ ] Status workflow — To Do → Assigned → In Progress → Revisions → Internal Review → Client Review → Completed + Blocked
- [ ] Status pill click — inline dropdown
- [ ] Timesheet popover — time input, date/time range, Notes, Billable toggle, Save
- [ ] Time entries list per user
- [ ] Inbox notification on status change

---

## Week 5 — Inbox & personal timesheet

**Status:** Upcoming  
**Dates:** 12 May – 16 May 2026 *(may vary as per client changes)*  
**Focus:** Inbox feed · Activity panel · Filter drawer · My Timesheet weekly grid

### Planned Features

**Inbox feed**
- [ ] Time-grouped sections — Today, Yesterday, Last 7 Days, month
- [ ] Project task rows and subtask rows
- [ ] @mention tag highlighted in preview
- [ ] Mark all as read + Clear all
- [ ] Individual Clear per row

**Inbox activity panel**
- [ ] Slide panel on row click
- [ ] Task title + breadcrumb
- [ ] Threaded messages with file attachments
- [ ] Status change + assignment activity items
- [ ] Reaction icons + Reply + text composer

**Inbox filter drawer**
- [ ] Filter By — Mentions, Replies, Unread, Assigned to me, Overdue, Cleared
- [ ] Clients section with search
- [ ] Clear Filter + Apply buttons

**My Timesheet — weekly grid**
- [ ] Tasks vs Sun–Sat with daily target + Total column
- [ ] Per-day hour values per task row
- [ ] Timer icon per cell for quick logging
- [ ] Week navigation — arrows + date range label
- [ ] + Add task button

---

## Week 6 — Time reporting by team & by client

**Status:** Upcoming  
**Dates:** 19 May – 23 May 2026 *(may vary as per client changes)*  
**Focus:** Time Reports module · Team detail panel · Client detail panel · Export timesheet

### Planned Features

**Time Reports — By Team**
- [ ] By Team / By Client tab toggle
- [ ] Daily / Weekly / Monthly / Select dates filter
- [ ] Team table — Name, Hours Spent, Allowed Hours, Hourly Rate
- [ ] Row click — detail panel

**Team member detail panel**
- [ ] Member avatar + name + role badge
- [ ] Time filter + Sort + Billable toggle
- [ ] Total Hours — spent / allowed
- [ ] Hours allocation by client with task breakdown
- [ ] Export timesheet button

**Time Reports — By Client**
- [ ] Firms table — Company, Accounts Manager, Primary Contact, Time Spent
- [ ] Daily / Weekly / Monthly filter
- [ ] Row click — client detail panel

**Client detail panel**
- [ ] Firm name header + filter tabs + Billable toggle
- [ ] Total Hours summary
- [ ] Task breakdown — expandable rows with hours
- [ ] Export timesheet button

---

## Week 7 — Team pulse, integration & QA

**Status:** Upcoming  
**Dates:** 26 May – 30 May 2026 *(may vary as per client changes)*  
**Focus:** Team Pulse availability · Cross-feature wiring · Empty states · Permission enforcement · Client feedback review

### Planned Features

**Team Pulse**
- [ ] Team table — Name, Total Tasks, Pulse badge
- [ ] Available / Available Soon states
- [ ] Task count hover — status breakdown popover
- [ ] Daily / Weekly / Monthly filter
- [ ] Bulk select checkboxes

**Cross-feature integration**
- [ ] Task status change → Inbox notification for assignees
- [ ] Dashboard task counts sync to live data
- [ ] Team Pulse refresh on task update
- [ ] Time entries → Time Reports By Team + By Client
- [ ] New project → Dashboard + Firm Projects tab
- [ ] New user accepted → available in all team pickers

**Polish & QA**
- [ ] Empty states for all tables, panels and lists
- [ ] Loading skeleton screens
- [ ] Error boundary and network failure states
- [ ] Permission-based UI enforcement by role + extra permissions
- [ ] Responsive layout check across all screens
- [ ] Accessibility pass — keyboard navigation, focus rings
- [ ] Client feedback review and revisions

---

## Missing Features — Not in current Figma designs

### Critical — blocks real usage without these screens (13 gaps)

| Gap | Description |
|-----|-------------|
| Create Task form / modal | "Add Task" button exists across multiple views — no form or modal is designed anywhere in Figma. |
| Edit Task form | Edit appears in every task context menu but no edit form or modal is shown in any Figma screen. |
| Skill edit form (User + Org) | Edit pencil icon visible on skill cards — no edit slide-out is designed, only the create version exists. |
| Task Type edit form | Edit icon exists in Task Type table — no edit slide-out designed, only the create version exists. |
| Client Requests module | Tab appears on every firm page and in global Projects nav. No list, detail or data model is designed. |
| Notes module (Project + Firm) | Notes tab appears in Project Activity and Firm tab bar. No editor, list or save state is designed. |
| Global timer stop — task assignment | No prompt to assign logged time to a project or task when the timer is stopped. |
| My Timesheet — cell editing | Weekly grid values are display-only. No click-to-edit interaction is designed. |
| Sub-task creation form | "Add Task" in the Sub Tasks section has no form or modal designed behind it. |
| File upload in chat composers | File attachments appear in threads but no upload button exists in any reply composer. |
| Transcript Management module | "Manage Transcripts" Quick Link leads nowhere — no module, list or detail is designed. |
| Export format and destination | "Export Timesheet" and "Export project data" exist in multiple places. No format, flow or success state is designed. |
| Lead capture form — validation & backend | Marketing form has no validation states, no success screen, no GDPR consent and no submission endpoint. |

### High — needed for production quality (10 gaps)

| Gap | Description |
|-----|-------------|
| Inbox search + compose new thread | No search bar and no way to start a new conversation — only replies to existing activity rows. |
| Dashboard donut drill-down | Clicking a status segment should filter the Project Summary table — interaction not designed. |
| Focus Today panel — clickable CTAs | Count badges have no link. They should navigate to a filtered task list. |
| Task dependencies (blocked-by field) | Blocked status exists but no way to specify the cause. No dependency field is designed. |
| Permission logic specification | How Role combines with Extra Permissions is not documented. No UI enforcement rules specified. |
| Timesheet approval workflow | No submit-for-approval, approve or reject flow. Time entries have no sign-off mechanism. |
| Org Info — full details form | Org Info tab shows only a logo upload. No org name, address, timezone or billing email fields. |
| Firm — Notes + Time Reports tabs | Both tabs exist in the Firm page tab bar but neither has a screen designed for its content. |
| Attachment preview modal | PDF and MP4 attachments on project detail have no preview modal or download interaction. |
| Team Pulse workload bar + assign task | No visual capacity bar per member and no way to assign a task from the Pulse view. |

---

## Disclaimer — all timelines are subject to change

All timelines are estimates based on the Figma designs reviewed in April 2026. Dates shown for upcoming weeks are indicative only and may vary as per client direction, Figma updates or any changes in scope.

Timelines may be revised if:
- Figma designs are updated, revised or expanded — any redesign of a screen restarts effort for that screen
- New features are added to the Figma scope at any point
- Technical dependencies or API decisions are unresolved ahead of the relevant phase
- Client feedback requires revisions to previously completed work
- Team capacity or resourcing changes

Missing features listed above require Figma designs to be completed before any development can begin. The overall scope may extend beyond Week 7 and will be agreed with the client as designs are finalised.

*This is a living document and will be updated after every Figma revision or client direction change.*
