# AI Wealth Connections — Development Timeline

7-week plan · Week 1, 2 & 3 complete · Week 4 in progress from 5 May 2026 · All upcoming dates may vary as per client direction

| Stat | Value |
|------|-------|
| Weeks complete | 3 |
| Weeks remaining | 4 |
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

**Status:** Completed
**Dates:** 28 Apr – 2 May 2026
**Focus:** Settings (Personal · Org · Project) · Add Firm wizard · Firm overview & communications · Database migration · Test suite migration

### Features Completed

**Personal info (Settings)**
- [x] Name, email, photo upload
- [x] Change Password
- [x] Role display — read-only for logged-in user
- [x] Skills section
- [x] Settings tab bar

**Organisation info**
- [x] Logo upload
- [x] Skill Management table — type tag, description, members, usage count
- [x] Add a Skill slide-out — type, description, colour picker, team picker
- [x] Delete icon per skill row
- [x] Skill component refactored as reusable across admin settings

**Project settings**
- [x] Task Type Management table — type tag, description, default team, usage
- [x] Create A Task Type slide-out — name, description, colour, default team
- [x] Delete icon per row

**Add a firm (3-step wizard)**
- [x] Step 1 — Firm details: name, location, website, logo, description with full validation
- [x] Step 2 — Primary contact: Name, Role, Email, Phone (all optional with format validation)
- [x] Step 3 — Choose Account Manager (optional — firm can be created without one)
- [x] Step progress indicator
- [x] Duplicate firm name — inline error on name field with auto-navigation to Step 1
- [x] New firm appears in sidebar

**Firm overview**
- [x] Firm logo + name + About text
- [x] Actions — Edit, Delete
- [x] Right sidebar — Location, Website, Point of Contact, Accounts Manager
- [x] Tab bar — Overview / Client Requests / Projects / Time Reports / Notes

**Firm sidebar navigation**
- [x] Alphabetical firm list
- [x] + Add a firm pinned at top
- [x] Active firm highlighted
- [x] Expand/collapse toggle

**Database migration — Supabase → PostgreSQL + Sequelize ORM**
- [x] Replaced Supabase client with Sequelize ORM connected directly to PostgreSQL
- [x] All Sequelize models defined — User, Skill, UserSkill, Firm, Project, Task, Notification, Prompt, Transcript, OrgSettings
- [x] Consolidated all 42 migrations into single clean `postgres_schema.sql` for production
- [x] `data_only.sql` extracted from Supabase dump for EC2 deployment
- [x] Legacy Supabase files moved to `database/legacy/` — `database/README.md` written
- [x] Backend deployed on EC2 with remote PostgreSQL connection (`DB_HOST=3.27.124.90`)

**Test suite migration — Supabase mocks → Sequelize mocks**
- [x] Shared `mockModels.ts` helper built — `makeMockModel()`, `resetAllMocks()`, `mockModelsModule()`
- [x] All 7 test suites rewritten — 101 tests passing, 0 failures
- [x] Files migrated: `users.test.ts`, `users.controller.test.ts`, `users.service.test.ts`, `phone-validation.test.ts`, `skills.test.ts`, `auth/login.test.ts`, `auth/onboarding.test.ts`
- [x] `tsconfig.json` updated to include `__tests__` with Jest types — IDE errors resolved

**UI component enhancements**
- [x] `MultiSelect` — added `singleSelect` prop, closes dropdown after single selection
- [x] Role dropdown in `AddUserPage` and `EditUserDrawer` fixed to close on selection
- [x] Onboarding controller — fixed unexpected errors returning `500` instead of `400`
- [x] Phone patching mock sequence clarified — 5-step mock order for PATCH flow

### Daily Work Log — Week 3 (28 Apr – 2 May 2026)

| Day | Hours | Work Done |
|-----|-------|-----------|
| Mon, 28 Apr | 7 hrs — Dev | Admin settings page initiated — personal info, org settings, skills management table and slide-out built. Skill component refactored as reusable. |
| Tue, 29 Apr | 8 hrs — Dev | Add Firm 3-step wizard built — Step 1 (firm details with validation), Step 2 (primary contact, all optional), Step 3 (account manager, optional). Step progress indicator added. |
| Wed, 30 Apr | 7 hrs Dev · 1 hr Meeting | Firm overview page built — logo, about, sidebar details, tab bar. Duplicate firm name inline error handling implemented. Firm sidebar navigation completed. |
| Thu, 1 May | 8 hrs — Dev | Database migration — Supabase replaced with Sequelize ORM. All models defined. `postgres_schema.sql` consolidated from 42 migrations. EC2 remote PostgreSQL connection configured. |
| Fri, 2 May | 7 hrs — Dev | Full test suite migrated from Supabase mocks to Sequelize mocks. 101 tests passing. `tsconfig.json` updated with Jest types. MultiSelect `singleSelect` prop added and wired to role dropdowns. |

---

## Week 4 — Project management & task workflows

**Status:** In Progress
**Dates:** 5 May – 9 May 2026 *(may vary as per client changes)*
**Focus:** Project Summary · Project detail · Firm-scoped projects · My Tasks · Task status flow

### Sprint Goals
> Deliver end-to-end project and task management — from creating a project inside a firm, to assigning tasks, tracking status, and logging time. By end of week a team member should be able to create a project, add tasks, update status and log time.

---

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

### Day-by-Day Plan — Week 4 (5 May – 9 May 2026)

| Day | Focus | Planned Work |
|-----|-------|--------------|
| **Mon, 5 May** | Project foundation | Global Project Summary page — status-grouped list, project row UI, filter panel (status + firm). Backend API review for projects + tasks. |
| **Tue, 6 May** | Create project flow | Create Project modal/form — name, description, project type, task type, start/end dates, assignee picker, priority. Wire to backend `POST /api/projects`. |
| **Wed, 7 May** | Project detail | Project detail view — header, assignees, status, priority, due date, task type tags, description, attachments section, sub tasks list. |
| **Thu, 8 May** | My Tasks + Task status | My Tasks page — status-grouped tasks, left filter sidebar, row hover tooltip. Task status pill — inline dropdown with full workflow. Inbox notification on status change. |
| **Fri, 9 May** | Timesheet + QA | Timesheet popover — time input, date range, notes, billable toggle. Time entries list. Activity panel — Recent / Files / Notes tabs, chat thread, message composer. Bug fixes + QA pass. |

---

### Backend APIs Required This Week

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/projects` | List all projects (filter by firm, status) |
| POST | `/api/projects` | Create project |
| GET | `/api/projects/:id` | Project detail with members + task count |
| PATCH | `/api/projects/:id` | Update project |
| DELETE | `/api/projects/:id` | Delete project |
| GET | `/api/projects/:id/members` | List project members |
| POST | `/api/projects/:id/members` | Add member to project |
| DELETE | `/api/projects/:id/members/:userId` | Remove member |
| GET | `/api/tasks` | List tasks (filter by project, status, assignee) |
| POST | `/api/tasks` | Create task |
| PATCH | `/api/tasks/:id` | Update task (status, assignee, priority) |
| PATCH | `/api/tasks/:id/transition` | Status transition with validation |
| GET | `/api/tasks/:id/time-logs` | Get time logs for task |
| POST | `/api/tasks/:id/time-logs` | Add time log entry |

---

### Definition of Done — Week 4

- [ ] A user can create a project inside a firm
- [ ] A user can view all projects in the global project summary
- [ ] A user can open a project and see tasks, assignees, due date
- [ ] A user can change task status via inline pill dropdown
- [ ] A user can log time on a task via the timesheet popover
- [ ] My Tasks page shows tasks assigned to logged-in user grouped by status
- [ ] Inbox notification fires when a task status changes
- [ ] All new pages have empty states
- [ ] No TypeScript errors — `npm run build` passes clean

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
