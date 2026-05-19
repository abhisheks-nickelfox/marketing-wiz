# Projects Architecture — MarketingWiz

> Reference document for all development work on the Projects system.
> Covers both project surfaces, every component, task/subtask model,
> API contracts, status workflows, and current gaps.

---

## 1. The Two Project Surfaces

The project system lives in two separate but **shared-component** surfaces:

| Surface | Route | Entry point | Scope |
|---------|-------|-------------|-------|
| **Projects Hub** | `/projects` | `ProjectsSummaryPage.tsx` | All firms, cross-client view |
| **Firm Projects Tab** | `/firms/:id` → Projects tab | `FirmDetailPage.tsx` → `ProjectsTab` | Single firm, scoped view |
| **Project Detail** | `/firms/:firmId/projects/:projectId` | `ProjectFullPage.tsx` | Single project, full edit |
| **Shared View** | `/shared/project/:token` | `SharedProjectPage.tsx` | Public, read-only, no auth |

### How They Are Connected

```
App.tsx (Router)
│
├── /projects                          → ProjectsSummaryPage
│     └── uses ProjectsTab (no firm prop) → shows ALL projects
│           └── ProjectGroupRow → click title → navigate to ProjectFullPage
│
├── /firms/:firmId/projects/:projectId → ProjectFullPage
│     └── Full edit / task management page
│
├── /firms/:id                         → FirmDetailPage
│     └── Tab "Projects" → ProjectsTab (firm prop passed)
│           └── firm prop causes useTasks + useProjects to filter by firm_id
│           └── ProjectGroupRow → click title → navigate to ProjectFullPage
│
└── /shared/project/:token             → SharedProjectPage (public, no auth)
```

**The key insight:** `ProjectsTab` is the shared workhorse component. It is rendered in both
`ProjectsSummaryPage` and `FirmDetailPage`. The only difference is whether a `firm` prop is
provided. When `firm` is provided → all API calls are scoped to that `firm.id`. Without it → all firms.

---

## 2. Component Tree

### 2.1 ProjectsSummaryPage (`/projects`)

```
ProjectsSummaryPage
│
├── State: selectedFirmId, viewMode (by-status | by-firm), filters
│          addModalOpen, editProject, deleteTarget
│
├── Data:  useProjects()         → ALL projects (no firm filter)
│          useFirms()            → firm list for filter dropdown
│          useUpdateProject()    → PATCH /projects/:id
│          useDeleteProject()    → DELETE /projects/:id
│          useCreateProject()    → POST /projects
│
├── Layout: two view modes
│   ├── "By Status" — 8 sections (see §5 Status Workflow)
│   │     each section: ProjectGroupRow[] for projects whose tasks fall in that status
│   └── "By Firm"  — grouped by firm_name
│         each firm: ProjectGroupRow[] for that firm
│
├── ProjectGroupRow (per project)
│   └── see §2.3
│
├── AddProjectModal (create flow)
│   └── see §2.5
│
├── ProjectDetailPanel (edit slide-over)
│   └── see §2.4
│
└── DeleteProjectModal (delete with task selection)
    └── see §2.6
```

### 2.2 FirmDetailPage → ProjectsTab (`/firms/:id`)

```
FirmDetailPage
│
├── Tabs: Overview | Client Requests | Projects | Time Reports | Firm Details
│
└── Tab "Projects" → <ProjectsTab firm={firm} tasks={tasks} users={users} />
      │
      ├── Same component as used in ProjectsSummaryPage
      ├── firm prop is truthy → all API calls use firm.id as filter
      │
      ├── State: viewMode (projects | tasks), filters, modals
      │
      ├── Data:  useProjects(firm.id)   → projects for this firm
      │          useTasks({ firm_id })  → all tasks for this firm
      │          useUsers()             → team members for assignee pickers
      │
      ├── "Projects" view mode → ProjectGroupRow per project
      └── "Tasks" view mode   → flat task list with status grouping
```

### 2.3 ProjectGroupRow

The row rendered for each project inside both surfaces.

```
ProjectGroupRow
│
├── Props: project, tasks (all tasks), users, onEdit, onDelete, isExpanded
│
├── Header row
│   ├── Expand / collapse chevron
│   ├── ProjectIcon
│   ├── Project name (click → navigate to ProjectFullPage)
│   ├── WorkflowStatus badge
│   ├── Priority badge
│   ├── AvatarStack (project.members — up to 3 + overflow count)
│   ├── Inline member picker (popover, add/remove members)
│   └── Context menu: Edit (→ ProjectDetailPanel), Delete (→ DeleteProjectModal)
│
└── Expanded task list (when isExpanded = true)
      ├── TaskRow per top-level task (parent_task_id = null)
      │     └── Each TaskRow renders its own subtasks (recursive)
      └── "+ Add task" button → inline task creation
```

### 2.4 ProjectDetailPanel (edit slide-over)

Triggered from ProjectGroupRow context menu → "Edit".

```
ProjectDetailPanel
│
├── Input: project name
├── Textarea: description
├── Dropdown: workflow_status (To Do / In Progress / In Review / Approved / Completed / Blocked)
├── Dropdown: priority (High / Medium / Low)
├── Date picker: start_date
├── Date picker: end_date (must be after start_date)
├── Member list: current members with remove (×) buttons
├── Add member picker: search + click to add
├── Task list: tasks in this project (read-only, with status badges)
├── Attachments section (list + upload)
└── Save → PATCH /projects/:id   |   Cancel → discard
```

### 2.5 AddProjectModal (create flow)

```
AddProjectModal
│
├── Formik form with Yup validation
├── Template dropdown (currently cosmetic / future feature)
├── Project name (required, must contain at least one letter)
├── Description textarea (optional)
├── Start date picker
├── End date picker (validated: must be > start_date)
├── Assignees multi-select (from useUsers())
├── Priority selector (High / Medium / Low chips)
├── File upload zone (drag-and-drop, stored as ProjectAttachment)
└── Submit → POST /projects  →  invalidates ['projects'] query cache
```

### 2.6 DeleteProjectModal

```
DeleteProjectModal
│
├── Fetches tasks via GET /projects/:id/tasks
├── Displays task tree (parent tasks + their subtasks)
├── "Select all" checkbox
├── Each task row: checkbox + title + status badge + priority badge
├── Submit logic:
│   ├── Sends DELETE /projects/:id  with { task_ids: string[] }
│   ├── Backend deletes selected tasks first, then the project (if now empty)
│   └── If project still has tasks → project NOT deleted, returns hasTickets: true
└── Confirmation shows count: "Delete X tasks and this project"
```

### 2.7 ProjectFullPage (`/firms/:firmId/projects/:projectId`)

The richest surface — full project edit + task management.

```
ProjectFullPage
│
├── Data:  useProjects() or projectsApi.get(projectId)
│          useTasks({ project_id })         → top-level tasks only
│          tasksApi.listSubTasks(taskId)    → subtasks per task
│          useUsers()                       → assignee options
│          useProjectAttachments(projectId) → files
│          useTimeEntries(projectId)        → project-level time
│
├── Left panel: Task table
│   ├── Status-grouped sections (To Do / In Progress / etc.)
│   ├── TaskRow per task → expandable to show subtasks
│   ├── Inline assignee picker per task
│   ├── Inline title edit (double-click)
│   ├── "+ Add task" per section
│   └── Deadline conflict modal (when moving task with deadline outside project dates)
│
├── Right panel: Activity / Timesheet / Details tabs
│   ├── Activity tab: chronological recent activity + comments
│   ├── Files tab: attachments (upload / download / delete)
│   ├── Notes tab: project notes
│   └── Timesheet tab: ProjectTimesheetPanel
│         ├── Manual time entry (hours + date + note)
│         ├── Timer start/stop
│         └── Time entries table grouped by task
│
├── Top metadata grid
│   ├── Assignee (project lead), Status, Priority, Due date
│   └── Edit button → ProjectDetailPanel slide-over
│
└── Share button → POST /projects/:id/share → copies public URL to clipboard
```

### 2.8 ProjectSummaryPanel

A lighter read-mainly slide-over used within ProjectFullPage's right panel.

```
ProjectSummaryPanel
│
├── Project name, description
├── Metadata: status, priority, start/end date, assignee
├── Task type tags (from tasks in this project)
├── Timesheet summary (total hours, by task breakdown)
├── Task list with status badge per task
├── Custom fields (future — currently empty)
├── Attachments list (view/download)
└── Actions menu: Edit (→ ProjectDetailPanel) | Copy share link | Archive | Delete
```

---

## 3. Task & Subtask Model

### 3.1 Task Interface (frontend)

```typescript
interface Task {
  id:              string;
  session_id:      string | null;      // transcript processing session
  firm_id:         string;
  project_id:      string | null;      // null = unassigned task
  parent_task_id:  string | null;      // null = top-level task; set = sub-task
  task_type_id:    string | null;      // FK to task_types catalog
  assignee_id:     string | null;      // primary assignee (legacy)
  title:           string;
  description:     string | null;
  type:            string;             // 'task' | 'design' | 'development' | ...
  priority:        'low' | 'normal' | 'high' | 'urgent';
  status:          TaskStatus;         // see §5
  deadline:        string | null;
  estimated_hours: number | null;
  ai_generated:    boolean;
  edited:          boolean;
  archived:        boolean;
  created_at:      string;

  // Joined relations (not always present — depends on endpoint)
  firms?:     { name: string };
  assignee?:  { name: string; email: string } | null;  // legacy single assignee
  assignees?: TaskAssignee[];                            // multi-assignee array
  subtasks?:  Task[];                                    // populated by listSubTasks
}
```

### 3.2 Parent / Sub-task Relationship

```
Ticket table (DB name: tickets, API name: tasks)
│
├── parent_task_id IS NULL  →  top-level task
│     └── Has its own row in the project task table
│
└── parent_task_id = <uuid>  →  sub-task
      └── Rendered indented under its parent in TaskRow
```

**Rules:**
- Sub-tasks inherit `firm_id` and `project_id` from their parent on creation
- Sub-tasks do NOT appear in `GET /tasks` list — that endpoint returns only top-level tasks (`parent_task_id IS NULL`)
- Sub-tasks are fetched separately via `GET /tasks/:parentId/subtasks`
- In `TaskRow`, subtasks are loaded lazily on expand (or passed down if already available in `task.subtasks`)
- DeleteProjectModal fetches via `GET /projects/:id/tasks` which returns ALL tasks (parent + sub) for the confirmation tree
- Nesting is **one level deep** in the current UI (sub-task cannot have its own sub-tasks via the UI, though the DB schema allows it)

### 3.3 Multi-Assignee Model

Tasks support both a legacy `assignee_id` (single) and the newer `assignee_ids` array:

```
tickets.assignee_id         →  primary assignee (single FK — legacy)
task_assignees junction     →  assignee_ids[] (multi, new model)
```

`fetchTaskAssignees(taskId)` in `tasks.service.ts` queries the junction table and returns `TaskAssignee[]`. When a task is updated via `PATCH /tasks/:id` with `assignee_ids`, the service calls `syncTaskAssignees()` which diffs and upserts the junction table.

`syncAssigneesToProjectMembers()` is called after task assignment — it automatically adds new assignees to the project's member list if they aren't already there.

---

## 4. API Contracts

### 4.1 Projects Endpoints

| Method | Path | Auth | Body / Params | Returns |
|--------|------|------|---------------|---------|
| GET | `/api/projects` | member | `?firm_id=` | `Project[]` |
| GET | `/api/projects/:id` | member | — | `Project` with members + ticket_count |
| GET | `/api/projects/:id/overview` | member | — | `ProjectOverview` (tasks grouped by status) |
| POST | `/api/projects` | admin | `CreateProjectPayload` | `Project` |
| PATCH | `/api/projects/:id` | admin | `UpdateProjectPayload` | `Project` |
| PATCH | `/api/projects/:id/archive` | admin | — | `Project` (status toggled) |
| DELETE | `/api/projects/:id` | admin | `{ task_ids: string[] }` | `{ deleted, hasTickets, projectDeleted }` |
| GET | `/api/projects/:id/tasks` | member | — | `{ id, title, status, priority, parent_task_id }[]` |
| GET | `/api/projects/:id/members` | member | — | `User[]` |
| POST | `/api/projects/:id/members` | admin | `{ user_id }` | `User[]` |
| DELETE | `/api/projects/:id/members/:userId` | admin | — | `User[]` |
| POST | `/api/projects/:id/share` | admin | — | `{ share_token }` |
| GET | `/api/projects/shared/:token` | public | — | `SharedProjectView` |

### 4.2 Tasks Endpoints (relevant to project context)

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/api/tasks` | member | `?project_id=`, `?firm_id=`, `?status=`, `?assignee_id=`, `?overdue=` — returns top-level only |
| POST | `/api/tasks` | member | `parent_task_id` in body → creates sub-task |
| GET | `/api/tasks/:id` | member | Single task with assignees |
| GET | `/api/tasks/:id/subtasks` | member | All sub-tasks for a parent |
| PATCH | `/api/tasks/:id` | member | `assignee_ids[]` triggers junction sync + auto-adds to project members |
| PATCH | `/api/tasks/:id/transition` | admin | Status transition with optional `change_note` |
| DELETE | `/api/tasks/:id` | admin | Hard delete (use only for discarded tasks) |

### 4.3 CreateTaskPayload

```typescript
interface CreateTaskPayload {
  firm_id:          string;       // required
  title:            string;       // required
  type?:            string;       // 'task' | 'design' | 'development' | 'account_management'
  task_type_id?:    string;       // FK to task_types catalog (newer model)
  priority?:        'low' | 'normal' | 'high' | 'urgent';
  description?:     string;
  project_id?:      string;       // link to project
  assignee_id?:     string;       // legacy single assignee
  assignee_ids?:    string[];     // multi-assignee (preferred)
  deadline?:        string;       // ISO date
  start_date?:      string;
  estimated_hours?: number;
  initial_status?:  string;       // default: 'to_do'
  parent_task_id?:  string;       // set to create a sub-task
}
```

---

## 5. Status Workflows

### 5.1 Task Status Workflow

```
to_do ──────→ assigned ──→ in_progress ──→ internal_review ──→ client_review ──→ completed
  ↑                             ↑  ↑               ↑  ↑              ↑
  │                             │  └── revisions ──┘  └── revisions ──┘
  │                             │          ↑
  └──── blocked ─────────────────           │
              ↑                             └── from in_progress
              └─── from in_progress / to_do
```

**Valid transitions** (enforced in `VALID_TRANSITIONS` in `api.ts` and backend):

| From | To (allowed) |
|------|-------------|
| `to_do` | `assigned`, `in_progress`, `blocked` |
| `assigned` | `in_progress`, `blocked` |
| `in_progress` | `revisions`, `internal_review`, `blocked` |
| `revisions` | `in_progress` |
| `internal_review` | `client_review`, `revisions` |
| `client_review` | `completed`, `revisions` |
| `completed` | — (terminal) |
| `blocked` | `to_do`, `in_progress` |

### 5.2 Project Workflow Status

Project-level progress indicator (separate from individual task statuses):

| Value | Display label | Meaning |
|-------|--------------|---------|
| `todo` | To Do | Not started |
| `in_progress` | In Progress | Active work |
| `in_review` | In Review | Under review |
| `approved` | Approved | Client signed off |
| `completed` | Completed | Done |

This is a **manually set** field on the project — it does NOT auto-derive from task statuses. The `ProjectsSummaryPage` groups projects by this `workflow_status` when in "By Status" view.

### 5.3 Project Status (Visibility)

Separate from `workflow_status`:

| Value | Meaning |
|-------|---------|
| `active` | Visible everywhere |
| `archived` | Hidden from default lists, accessible via filter |

Toggled via `PATCH /projects/:id/archive`.

---

## 6. Data Flow Diagrams

### 6.1 ProjectsTab Data Flow

```
ProjectsTab
│
├── useProjects(firm?.id)        → GET /projects?firm_id=...
│     returns: Project[]         (includes members[], ticket_count)
│
├── useTasks({ firm_id, project_id })  → GET /tasks?firm_id=...
│     returns: Task[]            (top-level only, parent_task_id IS NULL)
│     Note: subtasks loaded lazily in TaskRow via GET /tasks/:id/subtasks
│
├── useUsers()                   → GET /users
│     returns: User[]            (for assignee pickers)
│
└── Renders ProjectGroupRow for each project
      ↓
      ProjectGroupRow receives:
        project: Project
        tasks: Task[]  ← filtered to project.id inside component
        users: User[]
```

### 6.2 Task Create → Sub-task Flow

```
User clicks "+ Add Sub-task" in TaskRow context menu
  ↓
TaskRow opens inline input or CreateTaskModal
  ↓
POST /api/tasks  { parent_task_id: parentTask.id, firm_id, project_id }
  ↓
Backend:
  1. Inserts ticket row with parent_task_id set
  2. Copies firm_id + project_id from parent if not provided
  3. Calls syncAssigneesToProjectMembers if assignee_ids provided
  ↓
Frontend:
  useTasks query is invalidated → re-fetches top-level tasks
  TaskRow for parent re-fetches subtasks via GET /tasks/:id/subtasks
  Sub-task appears indented under parent
```

### 6.3 Assignee → Project Member Auto-sync

```
User assigns a team member to a task inside a project
  ↓
PATCH /tasks/:id  { assignee_ids: ['user-uuid'] }
  ↓
Backend tasks.service:
  1. syncTaskAssignees(taskId, assigneeIds) — updates task_assignees table
  2. syncAssigneesToProjectMembers(projectId, assigneeIds)
       → for each assignee NOT in project_members:
           INSERT INTO project_members (project_id, user_id, added_at)
  3. Posts system message: "@user was added to the project"
  ↓
project.members array now includes the new assignee automatically
```

### 6.4 Delete Project Flow

```
User clicks "Delete" on a project
  ↓
DeleteProjectModal opens
  ↓
GET /projects/:id/tasks   (fetches all tasks + sub-tasks for display)
  ↓
User selects which tasks to delete (checkboxes)
  ↓
DELETE /projects/:id  { task_ids: ['uuid1', 'uuid2', ...] }
  ↓
Backend projects.service.deleteProject():
  1. Delete selected tickets (hard delete)
  2. Check if project still has any remaining tickets
  3. If no remaining tickets → delete project row
  4. If remaining tickets exist → return { projectDeleted: false, hasTickets: true }
  ↓
Frontend: if projectDeleted = true → remove from cache, close modal
          if hasTickets = true     → show "Project has remaining tasks" warning
```

---

## 7. Backend Service — Key Methods

### projects.service.ts

| Method | What it does |
|--------|-------------|
| `findAllProjects(firmId?)` | Fetches all active projects. Batch-loads members for all returned projects in one extra query (avoids N+1). Joins firm name. |
| `findProjectById(id)` | Single project with firm name, ticket count (Ticket.count), members array. |
| `getProjectOverview(id)` | Full overview: project row + members + `tasks_by_status` (all tasks grouped) + `task_totals` count object. Used by ProjectFullPage. |
| `createProject(dto)` | Inserts project row, then calls `syncMembers()` to insert project_members rows. |
| `updateProject(id, updates)` | Updates project fields, calls `syncMembers()` if member_ids provided. |
| `addProjectMember(projectId, userId)` | Inserts one project_members row. Also calls `postSystemMessage()` to log a system message in the project chat. |
| `removeProjectMember(projectId, userId)` | Removes one project_members row + system message. |
| `getProjectTasks(id)` | All tickets (top-level + sub-tasks) for delete modal display. Returns minimal shape: `{ id, title, status, priority, parent_task_id }`. |
| `generateShareToken(projectId)` | Returns existing share_token if set, otherwise generates UUID v4, stores in DB, returns it. |
| `getPublicProjectView(token)` | No auth. Finds project by share_token, returns `SharedProjectView` with aggregated task counts. |
| `deleteProject(id, taskIds)` | Hard-deletes selected task IDs, then checks remaining ticket count. Deletes project only if empty. |

### tasks.service.ts (project-relevant parts)

| Method / Helper | What it does |
|----------------|-------------|
| `syncTaskAssignees(taskId, assigneeIds)` | Diffs task_assignees junction table: removes stale, inserts new. |
| `fetchTaskAssignees(taskId)` | Returns `TaskAssignee[]` with avatar_url from users join. |
| `syncAssigneesToProjectMembers(projectId, assigneeIds)` | Adds assignees as project members if not already present. |
| `getProjectMemberIds(projectId)` | Returns string[] of user_ids in a project's member list. |
| `findAllTasks(options)` | Lists top-level tasks only (`parent_task_id: null`). RBAC: members without `view_all_tickets` see only their own tasks via `assigneeCondition(userId)`. |
| `listSubTasks(parentId)` | Returns all tasks where `parent_task_id = parentId`, with assignees joined. |

---

## 8. React Query Cache Keys

| Hook | Query key | Invalidated by |
|------|-----------|----------------|
| `useProjects(firmId)` | `['projects', firmId]` | create, update, delete, archive |
| `useTasks(params)` | `['tasks', params]` | create task, update task, delete task |
| `useTask(id)` | `['task', id]` | update task |
| `useMyTasks(assigneeId)` | `['myTasks', assigneeId]` | update task |
| `useTasksByFirm(firmId)` | `['tasksByFirm', firmId]` | create/update/delete task |

> **Note:** When a task's `project_id` or `assignee_ids` changes, the mutation hooks invalidate
> BOTH `['tasks', ...]` and `['projects', ...]` so project member lists and ticket counts refresh.

---

## 9. What Is Currently Working

| Feature | Status |
|---------|--------|
| List all projects (global + per-firm) | ✅ Working |
| Create project with members, dates, priority | ✅ Working |
| Edit project (name, description, status, priority, dates, members) | ✅ Working |
| Archive / unarchive project | ✅ Working |
| Delete project with selective task deletion | ✅ Working |
| View project tasks grouped by status | ✅ Working |
| Add top-level task to project | ✅ Working |
| Add sub-task (one level deep) | ✅ Working |
| Inline assignee picker on task row | ✅ Working |
| Multi-assignee sync → auto-add to project members | ✅ Working |
| Status transition on tasks (with change_note) | ✅ Working |
| Share project via public token | ✅ Working |
| Public shared project view | ✅ Working |
| Project time entries / timer | ✅ Working |
| Project file attachments | ✅ Working |
| Deadline conflict check when moving task | ✅ Working |
| ProjectFullPage activity feed | ✅ Working |
| Notifications for project scope (@mentions in project chat) | ✅ Working |
| SSE real-time inbox updates for project messages | ✅ Working |

---

## 10. Known Gaps & Issues

| Gap | Location | Impact |
|-----|----------|--------|
| Sub-task of a sub-task not exposed in UI | `TaskRow` renders 1 level of nesting only | DB supports it, frontend doesn't |
| `workflow_status` is manually set — does NOT auto-derive from task statuses | `ProjectGroupRow`, `ProjectDetailPanel` | Project can show "Completed" while tasks are still open |
| `DeleteProjectModal` only shows `to_do` status tasks — other tasks silently stay after project deletion | `DeleteProjectModal.tsx` | Could leave orphaned tasks with a `project_id` pointing to deleted project |
| `useTasks` cache keys don't always include `project_id` param correctly | `useTasks.ts` | Possible stale cache when switching between projects |
| Inline task creation in `ProjectGroupRow` doesn't prompt for subtask details | `ProjectGroupRow.tsx` | Quick-add lacks description / deadline / priority fields |
| `ticket_count` on Project model is never scoped to archived — counts all tickets | `projects.service.ts:findProjectById` | Count appears inflated after archiving tasks |
| No bulk status transition on tasks within a project | — | Requires individual task PATCH calls |
| `ProjectsSummaryPage` "By Firm" view is not implemented — placeholder only | `ProjectsSummaryPage.tsx` | Firm grouping view not functional |
| `SharedProjectPage` shows no task list — only totals | `SharedProjectPage.tsx` | External stakeholders can't see individual tasks |
| No pagination on `GET /projects` or `GET /tasks?project_id=` | backend | Could slow on large datasets |

---

## 11. File Index

```
frontend-new/src/
│
├── pages/
│   ├── projects/
│   │   ├── ProjectsSummaryPage.tsx   ← /projects route (985 lines)
│   │   ├── ProjectFullPage.tsx       ← /firms/:id/projects/:id (852 lines)
│   │   └── SharedProjectPage.tsx     ← /shared/project/:token (125 lines)
│   └── firms/
│       └── FirmDetailPage.tsx        ← /firms/:id, tab "Projects" (197 lines)
│
├── components/
│   └── projects/
│       ├── ProjectsTab.tsx           ← shared tab rendered in both surfaces (936 lines)
│       ├── ProjectGroupRow.tsx       ← one project row + nested tasks (446 lines)
│       ├── ProjectDetailPanel.tsx    ← edit slide-over (393 lines)
│       ├── ProjectSummaryPanel.tsx   ← read-mostly slide-over (538 lines)
│       ├── AddProjectModal.tsx       ← create form modal (345 lines)
│       └── DeleteProjectModal.tsx    ← delete with task tree (254 lines)
│
├── components/tasks/
│   └── TaskRow.tsx                   ← task row with subtask tree (370 lines)
│
├── hooks/
│   ├── useFirms.ts                   ← useProjects, useCreateProject, etc.
│   ├── useTasks.ts                   ← useTask, useTasks, useUpdateTask, etc.
│   ├── useProjectAttachments.ts      ← attachment CRUD
│   └── useTimeEntries.ts             ← project timer + time entries
│
└── lib/api.ts                        ← projectsApi, tasksApi, interfaces

backend/src/modules/
│
├── projects/
│   ├── projects.routes.ts            ← all project + member + share routes
│   ├── projects.controller.ts        ← thin HTTP layer
│   ├── projects.service.ts           ← all DB queries + business logic (472 lines)
│   ├── projects.validation.ts        ← express-validator chains
│   ├── project-attachments.controller.ts
│   ├── project-attachments.validation.ts
│   └── dto/
│       ├── create-project.dto.ts
│       └── update-project.dto.ts
│
└── tasks/
    ├── tasks.routes.ts
    ├── tasks.controller.ts           ← createTask, listTasks, getTask, updateTask
    ├── tasks.service.ts              ← syncTaskAssignees, findAllTasks, listSubTasks
    ├── tasks.validation.ts
    └── dto/
        ├── create-task.dto.ts
        └── update-task.dto.ts

database/migrations/
│
├── 020_add_projects.sql              ← creates projects table, tickets.project_id FK
├── 021_update_v_tickets_full.sql     ← adds project_name to v_tickets_full view
├── 026_project_members_workflow.sql  ← adds workflow_status + project_members table
└── 027_user_skills_experience.sql    ← (unrelated, listed for migration sequence)
```
