# AI Wealth Connections — Feature Delivery Report

> **Project:** MarketingWiz — Transcript-to-Task SaaS Platform
> **Total Duration:** 7 Weeks · 13 Apr – 30 May 2026
> **Status:** Week 1–4 Complete · Week 5 In Progress · Week 6–7 Upcoming

---

## Progress Overview

| Week | Dates | Focus | Status |
|------|-------|-------|--------|
| Week 1 & 2 | 13 Apr – 24 Apr | User management · Onboarding · Dashboard | ✅ Complete |
| Week 3 | 28 Apr – 2 May | Settings · Firm management · DB migration | ✅ Complete |
| Week 4 | 5 May – 9 May | Project management · Task workflows | ✅ Complete |
| Week 5 | 12 May – 16 May | Inbox · Activity panel · My Timesheet | 🔄 In Progress |
| Week 6 | 19 May – 23 May | Time Reports · By Team · By Client | 📅 Upcoming |
| Week 7 | 26 May – 30 May | Team Pulse · Integration · QA | 📅 Upcoming |

---

## Additional Work Delivered Beyond Original Scope

> Features below were not in the original timeline. They were identified during development by referencing ClickUp and industry best practices, then implemented proactively to deliver a production-quality platform.

| # | Feature | Why Added |
|---|---------|-----------|
| 1 | **Assignee Change History** — every assignee add/remove recorded with actor & timestamp | Full audit trail — not in Figma |
| 2 | **Timer & Time Logs across full hierarchy** — project → task → sub-task with proper parent-child logs | Figma only showed task-level; ClickUp reference revealed full hierarchy needed |
| 3 | **Sub-Task System with Full Hierarchy** — create, nest 2 levels, full CRUD | Figma had display list only; full management required for real usage |
| 4 | **Task-Type Based Assignee Filtering** — assignee picker filtered by task type members | Not in Figma; prevents wrong team being assigned |
| 5 | **Double-Click Navigation UX** — single click opens panel, double click opens full page | Not in Figma; standard UX pattern for productivity tools |
| 6 | **Project Timesheet** — separate project-level time tracking distinct from per-task timesheet | Figma only had task-level; project-level required for time reporting |

---

---

## ✅ Week 1 & 2 — User Management · Onboarding · Dashboard

**Dates:** 13 Apr – 24 Apr 2026
**Total Days:** 10 working days

---

### 📅 Monday, 13 Apr — Infrastructure & Documentation

#### AWS Setup & Project Onboarding
- AWS environment provisioned and configured
  - Development, staging and production environments established
  - CI/CD pipeline initialised
  - Repository structure and branching strategy defined
  - Environment variables and secrets management configured
- Backend server deployed on AWS via reverse proxy
- Frontend deployed on server
- Team access provisioned for all members
- Technical documentation and AWS documentation finalised

---

### 📅 Tuesday, 14 Apr — Database Architecture & Auth Foundation

#### Database Architecture
- Full database schema designed per RBAC (Role-Based Access Control)
  - Tables: users, firms, projects, tasks, notifications, prompts, transcripts
  - Role constants standardised — Admin, PM, Member
  - DTO-based validation architecture planned

#### Authentication Foundation
- Frontend login pages initiated (as per Figma)
- Login journey with backend setup begun
- Role and status constants defined and standardised

---

### 📅 Wednesday, 15 Apr — Login · Profile Fields · Core UI Components

#### Login & Authentication
- Complete login journey — frontend form + backend JWT verification
- Forgot password journey with email notification
- SMTP email server configured and tested
- Status-based access control — disabled users blocked on login

#### Database Columns Added
- `first_name`, `last_name`, `phone_number` columns added via migration
- `avatar_url` column added
- `avatars` Supabase Storage bucket created (public, 2MB limit, image types only)

#### Core UI Components Built
- **FileUpload** — drag-and-drop image upload zone with file size validation
- **ImageCropModal** — 1:1 square crop with 8 gradient swatches, outputs 400×400 JPEG
- **PhoneInput** — country code picker (flag + ISO code, 10 countries) + number input with error state

---

### 📅 Thursday, 16 Apr — Invite Flow · Onboarding · Email

#### User Invite Flow
- Invite team form built — frontend, backend and database
  - HMAC-SHA256 signed invite token (24-hour expiry)
  - `invite_nonce` stored per user — rotating invalidates old links
  - Invite email sent via SMTP (console fallback when SMTP absent)

#### Multi-Step Onboarding Journey
- Step 1 — Set password
  - Password validation rules enforced
  - Supabase Auth password update on completion
- Step 2 — Personal details
  - First name, last name, phone number
  - Phone validated to E.164 format (`+[country code][digits]`)
- Step 3 — Avatar upload
  - Drag-and-drop upload → crop modal → save to storage
  - Falls back to base64 data URL in local dev
- Step 4 — Skills & experience
  - User selects skills from catalog
  - Experience level recorded per skill
  - Skill + experience written to `user_skills` junction table

#### First-Time User Guide
- Welcome guide modal shown to first-time users on dashboard
- Dismissible — does not show again after first close

---

### 📅 Friday, 17 Apr — Onboarding Polish · User List · Password Reset

#### Onboarding UI (Figma)
- Animated stepper component — step progress indicator with icons
- All onboarding steps styled as per Figma designs

#### User List Page
- Team member list rendered as per Figma
- Name, status badge, role/title, email, skills shown per row
- Edit and delete actions per row

#### Forgot Password Journey
- Forgot password page — email input form
- Reset link sent confirmation page
- Reset password page — token validated via Supabase, new password set

---

### 📅 Monday, 20 Apr — Bug Fixes · PM Role · Production Deployment

#### Bug Fixes & Role Updates
- Form validation bugs fixed — frontend, backend and database schema
- PM role added to invite flow
- Password field removed from new user creation (invite-only flow)
- Production bugs fixed on frontend

#### Production Environment
- Repository created for server deployment
- Frontend deployed and verified on server

---

### 📅 Tuesday, 21 Apr — Skills System

#### Skills Feature (User-Driven Model)
- Skills section moved from user creation into onboarding Step 4
- `skills` table created — name (unique), category, created_at
- `user_skills` junction table — user_id, skill_id, experience, created_at
  - Cascades on user or skill delete
- Skills API — list, create, delete (cascades user_skills)
- Frontend — multi-select searchable skills picker with inline add
- `users.member_role` column added — job title from catalog
- `users.status` column added — Active / invited / Disabled lifecycle

---

### 📅 Wednesday, 22 Apr — User Management Continued · AWS Infrastructure

#### User Management Enhancements
- User settings page — name, email, photo, role, cost, skills, extra permissions
- User status lifecycle enforced across list and settings pages

#### AWS Production Setup
- Infrastructure planning completed
- Environment configuration and deployment strategy finalised

---

### 📅 Thursday, 23 Apr — Validation · Auth Improvements · Unit Tests

#### Authentication & Onboarding Hardening
- DTO-based validation across all auth and onboarding endpoints
- Animated stepper polished and finalised
- Status inconsistency between user list and settings pages fixed
- Unexpected errors returning `500` fixed to return correct `400` responses

#### Unit Test Suite (Initial)
- Tests written for login flow (8 tests)
- Tests written for onboarding flow (12 tests)
- Tests written for phone number E.164 validation (12 tests)
- All tests passing with 0 failures

---

### 📅 Friday, 24 Apr — AWS Deployment · Validation · Rate Amount

#### Production Deployment
- Backend server fully deployed on AWS via reverse proxy
- Remote PostgreSQL connection configured (`DB_HOST` set to EC2 IP)

#### Final Validations
- Skill and experience validation issues resolved
- Rate amount field added to user invites
- Backend validation for user management finalised and tested

---

---

## ✅ Week 3 — Settings · Firm Management · Database Migration

**Dates:** 28 Apr – 2 May 2026
**Total Days:** 5 working days

---

### 📅 Monday, 28 Apr — Admin Settings Page

#### Personal Info (Settings)
- Name, email, photo upload
- Change password flow
- Role display — read-only for logged-in user
- Skills section with edit capability
- Settings tab bar navigation

#### Organisation Info
- Logo upload for organisation
- **Skill Management table**
  - Type tag, description, members count, usage count per row
  - Delete icon per skill row
- **Add a Skill slide-out panel**
  - Fields: type, description, colour picker, team member picker
  - Skill component refactored as reusable across all admin settings

---

### 📅 Tuesday, 29 Apr — Add a Firm 3-Step Wizard

#### Firm Creation Wizard
- **Step 1 — Firm Details**
  - Fields: name, location, website, logo upload, description
  - Full validation — required fields, URL format, duplicate name check
  - Duplicate firm name shows inline error with auto-navigation back to Step 1
- **Step 2 — Primary Contact** (all optional)
  - Fields: Name, Role, Email, Phone
  - Phone validated to E.164 format
- **Step 3 — Account Manager** (optional)
  - Choose from existing team members
  - Firm can be created without an account manager
- Step progress indicator shown throughout
- New firm appears in sidebar after creation

---

### 📅 Wednesday, 30 Apr — Firm Overview · Firm Sidebar Navigation

#### Firm Overview Page
- Firm logo + name + About text header
- Actions — Edit firm, Delete firm
- Right sidebar panel — Location, Website, Point of Contact, Accounts Manager
- **Tab bar navigation**
  - Overview / Client Requests / Projects / Time Reports / Notes

#### Firm Sidebar Navigation
- Alphabetical firm list in left sidebar
- "+ Add a firm" pinned at top
- Active firm highlighted
- Expand/collapse toggle for firm list

---

### 📅 Thursday, 1 May — Database Migration (Supabase → PostgreSQL + Sequelize)

#### Full Database Migration
- Replaced Supabase client with **Sequelize ORM** connected directly to PostgreSQL
- All Sequelize models defined:
  - User, Skill, UserSkill, Firm, Project, Task, Notification, Prompt, Transcript, OrgSettings
- **42 migrations consolidated** into single clean `postgres_schema.sql` for production
- `data_only.sql` extracted from Supabase dump for EC2 deployment
- Legacy Supabase files archived to `database/legacy/`
- `database/README.md` written with full instructions
- Backend deployed on EC2 with remote PostgreSQL connection

#### Project Settings
- **Task Type Management table**
  - Type tag, description, default team, usage count per row
  - Delete icon per row
- **Create A Task Type slide-out panel**
  - Fields: name, description, colour picker, default team picker
  - Task type members stored in `task_type_members` junction table

---

### 📅 Friday, 2 May — Test Suite Migration · UI Fixes

#### Full Test Suite Migration (Supabase → Sequelize Mocks)
- Shared `mockModels.ts` helper built
  - `makeMockModel()` — creates typed mock model instance
  - `resetAllMocks()` — resets all mocks between tests
  - `mockModelsModule()` — patches the entire models module
- **7 test suites rewritten — 101 tests passing, 0 failures**
  - `users.test.ts`
  - `users.controller.test.ts`
  - `users.service.test.ts`
  - `phone-validation.test.ts`
  - `skills.test.ts`
  - `auth/login.test.ts`
  - `auth/onboarding.test.ts`
- `tsconfig.json` updated to include `__tests__` with Jest types — IDE errors resolved

#### UI Component Fixes
- `MultiSelect` — `singleSelect` prop added, closes dropdown after single selection
- Role dropdown in `AddUserPage` and `EditUserDrawer` fixed to close on selection
- Onboarding controller — unexpected `500` errors corrected to return `400`

---

---

## ✅ Week 4 — Project Management · Task Workflows

**Dates:** 5 May – 9 May 2026
**Status:** Complete

---

### 📅 Monday, 5 May — Global Project Summary

#### Projects Summary Page
- Status-grouped sections — To Do, Assigned, In Progress, Internal Review
- **Project row** per entry:
  - Name + tags, client firm, assignees, due date, priority, workflow status badge
- Filter panel — filter by status, filter by firm
- Context menu per project — Edit, Delete

---

### 📅 Tuesday, 6 May — Create Project Flow

#### Create Project Modal
- Fields: name, description, project type, task type
- Start date + End date pickers
- Assignee multi-picker
- Priority selector
- Wired to `POST /api/projects` backend endpoint
- New project appears in firm's Projects tab and global summary

---

### 📅 Wednesday, 7 May — Project Detail View (ProjectFullPage)

#### Project Full Page
- **Header** — project name, created by, action menu
- **Metadata row** — assignees, workflow status, priority, due date, task type tags
- **Tab bar navigation**
  - Overview / Tasks / Timesheet / Chat / Members

#### Tasks Tab
- Tasks grouped by workflow status (To Do, In Progress, In Review, Approved, Completed)
- **Task row** per entry — title, status badge, assignee picker, due date, priority badge
- **Sub-task rows** nested under parent tasks
  - Nested sub-task rows (2nd level) indented below sub-tasks
- Add task button per status group
- Context menu per task — Edit, Delete, Resolve, Archive

#### Timesheet Tab *(Additional — beyond original scope)*
- Project-level time entries separate from per-task entries
- Start/stop timer at project level
- Time entries list grouped by user
- Per-entry: start time, duration, user avatar, notes

#### Chat Tab
- Threaded message feed scoped to project
- Message composer with send button
- Reply to message (threaded)
- Emoji reactions (add/remove per message)
- Real-time updates via SSE stream
- Soft delete messages

#### Members Tab
- List of project members with avatar, name, role
- Add member picker — searchable from active users
- Remove member action

---

### 📅 Thursday, 8 May — My Tasks · Task Status Flow

#### My Tasks Page
- Tasks assigned to logged-in user
- Grouped by status — To Do, Assigned, In Progress, etc.
- **Left quick-filter sidebar**
  - To Do / Assigned to Me / Today Due / Overdue / Active / Urgent / Blocked / Revisions / Closed / Complete
- Search tasks by title
- Filter by firm, filter by status
- Row hover — project name, client name shown
- Task detail panel opens on row click

#### Task Status Workflow
- Status pill — inline dropdown on click
- Full workflow: To Do → Assigned → In Progress → Revisions → Internal Review → Client Review → Completed + Blocked
- Status transition validated on backend — invalid transitions rejected
- Notification fired to assignees on status change

#### Task Detail Page
- Full standalone page for a single task
- **Metadata grid** — status, priority, type, assignee, due date, project, firm
- **Description** — rich text display
- **Assignees** — add/remove with avatar stack + picker
  - Filtered by task type members *(additional — not in Figma)*
- **Sub-tasks section**
  - List of sub-tasks with status, assignee, due date, priority
  - Add sub-task button
  - Click sub-task → opens sub-task detail panel
  - Double-click sub-task title → navigates to sub-task's own full detail page *(additional)*
- **Timesheet panel** — per-task time entries with start/stop timer
- **Activity panel** — activity log + chat thread for this task
- **Attachments section** — upload, view, delete files

---

### 📅 Friday, 9 May — Timer · Time Entries · Activity Panel

#### Global Timer Bar *(Additional — Figma gap)*
- Persistent purple bottom bar visible across all pages when timer is running
- Shows: pulsing dot indicator, task name, live elapsed time (HH:MM:SS), Stop button
- Timer state persisted to localStorage — survives page refresh and navigation
- Stop button stops timer and saves time entry to database

#### Timer & Time Logs — Full Hierarchy *(Additional — ClickUp reference)*
- Timer start/stop available at **project level**, **task level** and **sub-task level**
- Time logs recorded under their correct parent — project logs under project, task logs under task
- Full hierarchy maintained — sub-task logs visible under sub-task, rolled up under parent task
- Assignee change history recorded — every add/remove logged with actor and timestamp *(additional)*

#### Activity Panel
- Recent activity tab — status changes, assignments, time entries
- Chat thread — scoped messages per task or project
- Message composer with reply support

---

---

## 🔄 Week 5 — Inbox · Activity Panel · My Timesheet

**Dates:** 12 May – 16 May 2026
**Status:** In Progress (Today: 15 May 2026)

---

### Planned Features

#### Inbox Feed
- Time-grouped sections — Today, Yesterday, Last 7 Days, by Month
- Notification rows — task assignments, status changes, mentions, project updates
- `@mention` tag highlighted in message preview
- Mark all as read button
- Clear all button
- Individual Clear per notification row

#### Inbox Activity Panel (Right Side)
- Opens on notification row click
- Task title + breadcrumb path
- Threaded messages with file attachments
- Status change and assignment activity items
- Reaction icons + Reply composer
- Text composer for new message

#### Inbox Filter Drawer
- Filter by type — Mentions / Replies / Unread / Assigned to me / Overdue / Cleared
- Clients section with search
- Clear Filter + Apply buttons

#### My Timesheet — Weekly Grid
- Tasks vs Sun–Sat columns with daily target + Total column
- Per-day hour values editable per task row
- Timer icon per cell for quick time logging
- Week navigation — left/right arrows + date range label
- + Add task row button

---

---

## 📅 Week 6 — Time Reports by Team & by Client

**Dates:** 19 May – 23 May 2026
**Status:** Upcoming

---

### Planned Features

#### Time Reports — By Team Tab
- By Team / By Client tab toggle
- Daily / Weekly / Monthly / Select dates filter
- Team table — Name, Hours Spent, Allowed Hours, Hourly Rate per member row
- Row click → opens member detail panel

#### Team Member Detail Panel
- Member avatar + name + role badge
- Time filter + Sort + Billable toggle
- Total Hours — spent vs allowed
- Hours allocation breakdown by client with task-level detail
- Export timesheet button

#### Time Reports — By Client Tab
- Firms table — Company, Accounts Manager, Primary Contact, Time Spent
- Daily / Weekly / Monthly filter
- Row click → opens client detail panel

#### Client Detail Panel
- Firm name header + filter tabs + Billable toggle
- Total Hours summary
- Task breakdown — expandable rows with hours per task
- Export timesheet button

---

---

## 📅 Week 7 — Team Pulse · Integration · QA

**Dates:** 26 May – 30 May 2026
**Status:** Upcoming

---

### Planned Features

#### Team Pulse
- Team table — Name, Total Tasks, Pulse availability badge
- Available / Available Soon status states
- Task count hover — status breakdown popover per member
- Daily / Weekly / Monthly filter
- Bulk select checkboxes for team actions

#### Cross-Feature Integration
- Task status change → inbox notification fires for all assignees
- Dashboard task counts sync to live data
- Team Pulse refreshes on task update
- Time entries feed into Time Reports (By Team + By Client)
- New project appears in Dashboard Project Summary + Firm Projects tab
- New user accepted invite → available in all team pickers across platform

#### Polish & QA
- **Empty states** for all tables, panels and lists
- **Loading skeleton screens** during data fetch
- **Error boundary** and network failure states
- **Permission-based UI enforcement** — role + extra permissions applied to every button and route
- Responsive layout check across all screen sizes
- Accessibility pass — keyboard navigation, focus rings
- Client feedback review and revisions

---

---

## Notification System — Implementation Roadmap

> Notification triggers already live are marked ✅. Remaining phases planned for Week 4–5.

### Already Implemented ✅
| Trigger | Who Gets Notified |
|---------|-------------------|
| Task assigned to member | Assigned member |
| Task marked urgent | All current assignees |
| Task sent to revisions | Primary assignee |
| User onboarding complete | New user (welcome message) |
| User adds skills at onboarding | All admins |
| Invite sent / resent | All admins |
| Admin updates member profile | Affected member |
| Admin updates member skills | Affected member |

### Phase 1 — Task Notification Gaps (No migration needed)
- Multi-assignee task assigned — notify every assignee, not just primary
- Task unassigned — notify removed assignee
- Task status changed — notify all assignees on every transition
- Revisions requested for sub-tasks (currently only fires for top-level tasks)

### Phase 2 — Project Notifications (No migration needed)
- Member added to project → notify added member
- Member removed from project → notify removed member
- Project workflow status changed → notify all project members
- Project archived → notify all project members

### Phase 3 — Deadline Alerts (Cron jobs required)
- Task approaching deadline (24h warning) — hourly cron
- Task overdue — daily cron at 08:00

### Phase 4 — Inbox Design Features (Awaiting design sign-off)
- `@mention` parsing in messages — notify mentioned user
- Reply notification — notify author of parent message when replied to

---

---

## Disclaimer

All timelines are estimates based on Figma designs reviewed in April 2026. Dates shown for upcoming weeks are indicative and may vary as per client direction, Figma updates or scope changes.

Timelines may be revised if:
- Figma designs are updated, revised or expanded
- New features are added to scope at any point
- Technical dependencies or API decisions are unresolved ahead of the relevant phase
- Client feedback requires revisions to previously completed work

*This is a living document and will be updated after every Figma revision or client direction change.*
