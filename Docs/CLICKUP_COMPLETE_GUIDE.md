# ClickUp — Complete Feature Guide & Documentation

> ClickUp is an all-in-one project management platform that replaces tools like Jira, Trello, Asana, Notion, and Slack. It brings tasks, docs, goals, chat, and reporting into one workspace.

---

## 📌 Table of Contents

1. [Workspace Structure](#1-workspace-structure)
2. [Views](#2-views)
3. [Tasks](#3-tasks)
4. [Subtasks & Checklists](#4-subtasks--checklists)
5. [Custom Fields](#5-custom-fields)
6. [Statuses](#6-statuses)
7. [Priorities](#7-priorities)
8. [Assignees & Watchers](#8-assignees--watchers)
9. [Due Dates & Time Estimates](#9-due-dates--time-estimates)
10. [Docs](#10-docs)
11. [Goals & OKRs](#11-goals--okrs)
12. [Dashboards](#12-dashboards)
13. [Time Tracking](#13-time-tracking)
14. [Automations](#14-automations)
15. [Integrations](#15-integrations)
16. [Sprints](#16-sprints)
17. [Notifications & Activity](#17-notifications--activity)
18. [Permissions & Roles](#18-permissions--roles)
19. [AI Features (ClickUp Brain)](#19-ai-features-clickup-brain)
20. [Use Cases by Team](#20-use-cases-by-team)

---

## 1. Workspace Structure

ClickUp organises work in a hierarchy:

```
Workspace
└── Space
    └── Folder (optional)
        └── List
            └── Task
                └── Subtask
                    └── Checklist Item
```

### Workspace
- Top-level account (your company)
- Has billing, members, and global settings
- One workspace per company is standard

### Spaces
- Represent **departments or teams** (e.g. Engineering, Marketing, Design)
- Each Space has its own:
  - Members and permissions
  - Statuses
  - Custom fields
  - Views

### Folders
- Optional grouping inside a Space
- Used to organise **projects** or **product areas**
- Example: Space = Engineering → Folders = Frontend, Backend, DevOps

### Lists
- The actual container for tasks
- Think of a List as a **sprint**, a **project**, or a **feature backlog**
- Tasks inside a List share the same statuses

---

## 2. Views

ClickUp lets you view the same data in multiple formats. Views are per-List, per-Folder, or per-Space.

| View | Best For |
|---|---|
| **List** | Default task list — like a to-do list |
| **Board (Kanban)** | Visualise tasks by status column |
| **Calendar** | Tasks by due date on a calendar |
| **Gantt** | Timeline view with dependencies |
| **Table** | Spreadsheet-style with all custom fields |
| **Timeline** | Like Gantt but simpler, per-member |
| **Workload** | See capacity per team member |
| **Map** | Tasks pinned to geographic locations |
| **Mind Map** | Brainstorm tasks as a mind map |
| **Activity** | Feed of all recent changes |
| **Chat** | Threaded messages inside a List |

### How to Switch Views
- Click `+ Add View` at the top of any List or Folder
- Each view has its own filter and grouping settings
- Views are saved and shared with the team

---

## 3. Tasks

Tasks are the core unit of work in ClickUp.

### Creating a Task
- Click `+ New Task` inside any List
- Or press `T` anywhere (keyboard shortcut)
- Or use Quick Create with `Ctrl/Cmd + K`

### Task Properties

| Property | Description |
|---|---|
| **Name** | Task title |
| **Description** | Rich text editor — supports markdown, images, embeds |
| **Status** | Current stage (To Do, In Progress, Done, etc.) |
| **Priority** | Urgent / High / Normal / Low |
| **Assignee** | One or more team members |
| **Due Date** | Deadline with optional time |
| **Estimated Time** | How long the task should take |
| **Tags** | Free-form labels for filtering |
| **Attachments** | Files, screenshots, videos |
| **Comments** | Threaded discussion on the task |
| **Activity Log** | Full history of all changes |

### Task ID
Every task gets a unique ID (e.g. `#MW-123`) used for linking and referencing.

### Task Types (ClickUp 3.0)
You can define custom task types per Space:
- Bug
- Feature
- Story
- Epic
- Milestone
- (custom types you create)

---

## 4. Subtasks & Checklists

### Subtasks
- Full tasks nested under a parent task
- Have their own assignee, due date, status, and custom fields
- Appear in all views just like regular tasks
- Max nesting depth: 7 levels

**Use Case:** Break a feature task into subtasks per developer

### Checklists
- Lightweight to-do items inside a task
- No separate assignee or due date per item
- Great for step-by-step procedures or QA checklists
- Can be reused as templates

**Difference:**
| | Subtask | Checklist |
|---|---|---|
| Own status | ✅ Yes | ❌ No |
| Own assignee | ✅ Yes | ❌ No |
| Appears in views | ✅ Yes | ❌ No |
| Good for | Work items | Procedures |

---

## 5. Custom Fields

Custom Fields let you add extra data to tasks beyond the built-in properties.

### Field Types

| Type | Use Case |
|---|---|
| **Text** | Short notes, links, IDs |
| **Number** | Story points, budget, count |
| **Dropdown** | Fixed-choice menus |
| **Rating** | 1–5 star scoring |
| **Date** | Any additional date (e.g. launch date) |
| **Checkbox** | Yes/No toggle |
| **People** | Link to team member |
| **Email** | Contact email |
| **Phone** | Contact phone |
| **URL** | External link |
| **Currency** | Budget or cost field |
| **Progress Bar** | Visual % completion |
| **Formula** | Calculate values from other fields |
| **Relationship** | Link tasks across Lists |
| **Rollup** | Aggregate data from subtasks |
| **Labels** | Multi-select tags |
| **Location** | Map pin |

### Where Custom Fields Apply
- Set at Space, Folder, or List level
- Inherited by all tasks within that level
- Visible in Table view and filterable

---

## 6. Statuses

Statuses represent the lifecycle stage of a task.

### Default Statuses
```
To Do → In Progress → Done
```

### Custom Statuses
Each List/Space can have its own status set:

**Example — Engineering Sprint:**
```
Backlog → Ready → In Development → In Review → QA Testing → Done → Cancelled
```

**Example — Bug Tracking:**
```
Reported → Confirmed → In Fix → Fixed → Verified → Closed
```

### Status Categories
Every status maps to one of 4 categories:
- **Open** (work not started)
- **Active** (work in progress)
- **Done** (completed)
- **Closed** (archived/cancelled)

This categorisation powers reporting and automations.

---

## 7. Priorities

4 built-in priority levels:

| Priority | Colour | Meaning |
|---|---|---|
| 🔴 Urgent | Red | Drop everything — do this now |
| 🟠 High | Orange | Important — do this soon |
| 🔵 Normal | Blue | Standard work item |
| ⚪ Low | Grey | Nice to have — do when free |

Priorities are filterable and sortable across all views.

---

## 8. Assignees & Watchers

### Assignees
- Who is **responsible** for completing the task
- Can assign multiple people to one task
- Assigned tasks appear in the member's personal "My Tasks" view

### Watchers
- Who wants to be **notified** of updates (comments, status changes)
- Can watch without being assigned
- Automatically added when you comment on a task

### Me Mode
- Filter any view to show only tasks assigned to **you**
- Toggle with the `Me` button in the toolbar

---

## 9. Due Dates & Time Estimates

### Due Dates
- Set a specific date and optional time
- Overdue tasks highlighted in red
- Appear in Calendar and Gantt views
- Recurring due dates: Daily / Weekly / Monthly / Custom

### Time Estimates
- Set expected hours for a task (e.g. `4h`, `1d`, `2w`)
- Used in Workload view to show team capacity
- Compared against tracked time in reports

### Time in Status
- Automatically tracked — shows how long a task sat in each status
- Useful for identifying bottlenecks

---

## 10. Docs

ClickUp Docs is a built-in wiki and document editor.

### Features
- Rich text editor (headings, tables, code blocks, embeds)
- Nested pages (like Notion)
- Real-time collaborative editing
- Link Docs to tasks, Lists, Spaces
- Share publicly via link (read-only or editable)
- Version history
- Comments and @mentions

### Use Cases
- Technical documentation
- Meeting notes
- SOPs (Standard Operating Procedures)
- Sprint planning docs
- Onboarding guides
- API documentation

### Doc Templates
ClickUp has pre-built templates for:
- Project briefs
- Meeting agendas
- Product requirement documents (PRDs)
- Retrospectives
- OKR planning

---

## 11. Goals & OKRs

Goals let you define high-level outcomes and track progress automatically.

### Structure
```
Goal (Objective)
└── Target (Key Result)
    └── Linked to Tasks / Lists / Numbers / Currency / True-False
```

### Target Types
| Type | Example |
|---|---|
| **Task completion** | Complete 20 bug fixes |
| **Number** | Reach 1000 users |
| **Currency** | Achieve $50k MRR |
| **True/False** | Launch v2.0 |

### How Progress Updates
- Task targets: auto-update as linked tasks are completed
- Number/currency targets: manually updated or via integration
- Progress shown as a % bar on the Goal

### Use Case
```
Q2 Goal: Improve platform stability
├── Target: Fix 100% of critical bugs → linked to Bug List
├── Target: Achieve 99.9% uptime → updated manually
└── Target: Reduce load time to <2s → True/False
```

---

## 12. Dashboards

Dashboards provide a **real-time visual overview** of your project or team.

### Widget Types

| Widget | Shows |
|---|---|
| **Task List** | Filtered list of tasks |
| **Burndown Chart** | Sprint progress over time |
| **Velocity Chart** | Story points completed per sprint |
| **Pie Chart** | Tasks by status, priority, or assignee |
| **Bar Chart** | Comparison of any field |
| **Line Chart** | Trends over time |
| **Battery** | % completion of a List or Goal |
| **Time Tracked** | Hours logged per member |
| **Activity** | Recent task changes |
| **Embed** | External URL/iframe (Figma, Loom, etc.) |
| **Text** | Notes or headings |
| **Calculation** | SUM, AVG, MIN, MAX of numeric fields |

### Use Cases
- **Executive dashboard** — overall project health
- **Developer dashboard** — my tasks, open bugs, sprint burndown
- **Manager dashboard** — team workload, overdue tasks, velocity

---

## 13. Time Tracking

Built-in time tracker — no third-party tool needed.

### How It Works
- Start/stop timer on any task with one click
- Or manually log time (e.g. `2h 30m`)
- Add notes to each time entry
- Time entries shown in task activity

### Reporting
- Total time per task, List, Space, or member
- Compare estimated vs actual time
- Filter by date range
- Export to CSV

### Integrations
- Toggl
- Harvest
- Clockify
- Everhour

---

## 14. Automations

Automations trigger actions automatically based on conditions — no code required.

### Structure
```
WHEN [trigger] IF [condition] THEN [action]
```

### Triggers
- Task status changes
- Task created / deleted
- Assignee added / removed
- Due date arrives
- Custom field changes
- Form submitted
- Comment added

### Conditions
- Status equals X
- Priority is Urgent
- Assignee is [person]
- Tag includes [tag]
- Custom field value

### Actions
- Change status
- Assign to someone
- Move task to another List
- Create a subtask
- Post a comment
- Send an email
- Send a webhook
- Create a task in another List

### Example Automations

**Auto-assign bugs to QA:**
```
WHEN Status changes to "Fixed"
THEN Assign to QA Team
AND Change Status to "QA Testing"
```

**Alert on overdue tasks:**
```
WHEN Due Date passes
IF Status is not "Done"
THEN Post comment "@manager Task is overdue"
AND Change Priority to "Urgent"
```

**Move completed tasks:**
```
WHEN Status changes to "Done"
THEN Move to "Completed Archive" List
```

---

## 15. Integrations

ClickUp connects with 1000+ tools.

### Native Integrations

| Category | Tools |
|---|---|
| **Communication** | Slack, Microsoft Teams, Zoom |
| **Code** | GitHub, GitLab, Bitbucket, Sentry |
| **Design** | Figma, Adobe XD |
| **Calendar** | Google Calendar, Outlook |
| **Storage** | Google Drive, Dropbox, OneDrive |
| **CRM** | HubSpot, Salesforce |
| **Time** | Toggl, Harvest, Clockify |
| **Forms** | Typeform, Google Forms |
| **Email** | Gmail, Outlook |

### GitHub / GitLab Integration
- Link PRs and commits to ClickUp tasks
- Auto-update task status when PR is merged
- Task ID in commit message links automatically (e.g. `fix: login bug CU-abc123`)

### Slack Integration
- Get task notifications in Slack channels
- Create ClickUp tasks from Slack messages
- Update task status from Slack

### Webhooks & API
- REST API for full programmatic access
- Webhooks — send real-time events to any URL
- Use with Zapier / Make (Integromat) for custom flows

---

## 16. Sprints

ClickUp supports Agile sprint management.

### Setting Up Sprints
1. Enable **Sprints** in Space settings
2. Create a Sprint Folder — each sprint is a List inside
3. Set sprint duration (1 week, 2 weeks, etc.)
4. Add tasks to the sprint (from backlog)

### Sprint Features
- **Sprint Points** — story point field on tasks
- **Burndown Chart** — track completion over sprint days
- **Velocity Report** — compare points across sprints
- **Sprint Automation** — auto-move incomplete tasks to next sprint

### Backlog Management
- Maintain a Backlog List outside sprint folders
- Drag tasks into the current sprint List
- Prioritise using drag-and-drop or priority field

### Sprint Workflow Example
```
Backlog List
    ↓ (sprint planning — drag tasks in)
Sprint 12 List (May 5 – May 19)
    → Statuses: Backlog → In Dev → In Review → Done
    ↓ (end of sprint — incomplete tasks auto-moved)
Sprint 13 List
```

---

## 17. Notifications & Activity

### Notification Types
- Task assigned to you
- Comment mentioning you (`@you`)
- Status change on watched task
- Due date reminder
- Task completed
- Goal progress update

### Notification Channels
- In-app notification bell
- Email digest (immediate / hourly / daily)
- Slack / Teams (via integration)
- Mobile push notification

### Activity Feed
- Every task has a full activity log
- Shows: who changed what, and when
- Filters: comments only, status changes, all activity

### Inbox
- Central inbox for all your notifications
- Mark as done, snooze, or reply inline
- Filter by type or date

---

## 18. Permissions & Roles

### Workspace Roles

| Role | Access |
|---|---|
| **Owner** | Full access — billing, settings, delete workspace |
| **Admin** | Manage members, spaces, billing |
| **Member** | Work on tasks in their assigned Spaces |
| **Guest** | Limited access — only specific Lists shared with them |

### Space-Level Permissions
- Private Space — only invited members can see
- Public Space — all workspace members can see
- Custom: per-member access levels

### List-Level Sharing (Guest Access)
- Share a single List with external clients (guests)
- Guests see only that List — not the rest of the workspace
- Free guests: limited per plan

### Task-Level Privacy
- Individual tasks can be made private
- Only assignees and watchers can see private tasks

---

## 19. AI Features (ClickUp Brain)

ClickUp Brain is the built-in AI assistant.

### What It Can Do

| Feature | Description |
|---|---|
| **AI Writer** | Generate task descriptions, docs, comments |
| **Summarise** | Summarise long task threads or docs |
| **Action Items** | Extract next steps from meeting notes |
| **Auto-fill** | Suggest task names, descriptions, subtasks |
| **Translate** | Translate task content to another language |
| **Q&A** | Ask questions about your workspace data |
| **Spell & Grammar** | Fix writing in any text field |
| **Templates** | Generate task templates from a prompt |

### How to Use
- Click the ✨ AI button on any task description or Doc
- Type `/ai` in any text field
- Ask questions like:
  - *"Summarise all tasks due this week"*
  - *"What's blocking the sprint?"*
  - *"Write a bug report for this issue"*

---

## 20. Use Cases by Team

### Software Development Team

| Need | ClickUp Feature |
|---|---|
| Sprint planning | Sprint Lists + Story Points |
| Bug tracking | Custom task type "Bug" + Statuses |
| PR linking | GitHub integration |
| Velocity tracking | Velocity Report on Dashboard |
| Team capacity | Workload View |

### Project Management Team

| Need | ClickUp Feature |
|---|---|
| Project timeline | Gantt View |
| Task dependencies | Task relationships |
| Client updates | Guest access to specific Lists |
| Project health | Dashboard widgets |
| Risk tracking | Custom field "Risk Level" |

### Marketing Team

| Need | ClickUp Feature |
|---|---|
| Campaign calendar | Calendar View |
| Content pipeline | Kanban Board |
| Asset management | Attachments + Docs |
| Campaign briefs | Docs linked to tasks |
| Deadline tracking | Due dates + Calendar |

### HR & Operations Team

| Need | ClickUp Feature |
|---|---|
| Onboarding checklists | Checklists in tasks |
| SOPs | Docs with nested pages |
| Leave requests | Form → Task automation |
| Performance goals | Goals & OKRs |
| Meeting notes | Docs |

---

## 💡 Quick Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `T` | Create new task |
| `Ctrl/Cmd + K` | Quick search / create |
| `Ctrl/Cmd + Enter` | Save and close task |
| `S` | Change status |
| `A` | Assign task |
| `D` | Set due date |
| `P` | Set priority |
| `M` | Toggle Me mode |
| `?` | Open shortcuts help |

---

## 📦 Plans Overview

| Plan | Price | Key Limits |
|---|---|---|
| **Free Forever** | $0 | 100MB storage, unlimited tasks |
| **Unlimited** | $7/user/mo | Unlimited storage, Gantt, Goals |
| **Business** | $12/user/mo | Timesheets, Workload, Advanced Automations |
| **Enterprise** | Custom | SSO, audit logs, dedicated support |

---

## 🔗 Official Resources

- Documentation: https://help.clickup.com
- API Reference: https://clickup.com/api
- Template Centre: https://clickup.com/templates
- ClickUp University: https://university.clickup.com
- YouTube Channel: ClickUp (tutorials and walkthroughs)
