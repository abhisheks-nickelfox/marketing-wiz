# Code Quality Analysis — Projects, Tasks & Timesheet

**Scope:** `frontend-new/src/components/projects/`, `frontend-new/src/pages/projects/`,
`frontend-new/src/components/tasks/TaskDetailPanel.tsx`,
`frontend-new/src/pages/tasks/TaskDetailPage.tsx`,
`frontend-new/src/components/timesheet/TimesheetPanel.tsx`,
`frontend-new/src/components/timesheet/ProjectTimesheetPanel.tsx`,
`frontend-new/src/components/ui/AssigneePickerDropdown.tsx`,
`backend/src/modules/projects/projects.service.ts`,
`backend/src/modules/tasks/tasks.service.ts`

---

## Summary Table

| # | Problem | Severity | Files Affected |
|---|---------|----------|----------------|
| 1 | Status/badge constants duplicated 4× with diverging values | High | 4 files |
| 2 | `ProjectRow` duplicates `ProjectGroupRow` — ~300 lines of identical JSX | High | 2 files |
| 3 | `usersMap` created without `useMemo` — causes silent child re-renders | High | `ProjectsTab.tsx:414` |
| 4 | `interface ConflictInfo` defined inside function body | Medium | `ProjectsTab.tsx:109` |
| 5 | Conflict-resolution logic copy-pasted across two files | High | `ProjectsTab`, `ProjectFullPage` |
| 6 | `PRIORITY_MAP` / `PROJ_PRIORITY_MAP` defined 3× inside component bodies | Medium | 3 files |
| 7 | Inline dynamic `import()` types inside function signatures | Medium | `ProjectsTab.tsx` |
| 8 | 6–7 separate `useState` calls for filter state — no `useReducer` | Medium | `ProjectsTab.tsx`, `TaskDetailPanel.tsx` |
| 9 | `ProjectsSummaryPage.tsx` is 985 lines doing 5 unrelated jobs | High | `ProjectsSummaryPage.tsx` |
| 10 | `StatusDot` SVG re-drawn inline instead of using the exported component | Low | `ProjectsSummaryPage.tsx` |
| 11 | `TaskDetailPanel.tsx` defines `VALID_TRANSITIONS` locally — duplicate of backend constant | High | `TaskDetailPanel.tsx:100` |
| 12 | Timer + Timesheet block copy-pasted verbatim across two files | High | `TaskDetailPanel`, `TaskDetailPage` |
| 13 | `TimesheetPanel` and `ProjectTimesheetPanel` are 95% identical — no shared base | High | 2 timesheet files |
| 14 | `AssigneePickerDropdown` positions itself via a duplicated `useEffect` instead of a hook | Medium | `AssigneePickerDropdown.tsx` |
| 15 | `projects.service.ts` uses `sequelize.literal()` string interpolation — SQL injection risk | Critical | `projects.service.ts:215` |
| 16 | `getProjectOverview()` uses wrong status schema — all new-status tasks silently fall into `todo` | High | `projects.service.ts:234` |
| 17 | `tasks.service.ts` returns `unknown[]` and `Promise<unknown | null>` — complete type loss | High | `tasks.service.ts` |
| 18 | `console.log` left in production code | Low | `ProjectGroupRow.tsx:87` |
| 19 | Outside-click handling re-implemented inline in TimesheetPanel instead of using `useClickOutside` | Low | `TimesheetPanel.tsx:49` |
| 20 | Sub-task priority badge logic duplicated inline in TaskDetailPanel instead of using `PriorityBadge` | Medium | `TaskDetailPanel.tsx:564` |

---

## Issue 1 — Status/Badge Constants Duplicated 4× With Diverging Values

### Where it happens

| File | Constants | Line |
|------|-----------|------|
| `ProjectsSummaryPage.tsx` | `STATUS_GROUPS`, `TASK_STATUS_TO_GROUP`, `WORKFLOW_TO_GROUP`, `GROUP_TO_WORKFLOW`, `WORKFLOW_BADGE`, `GROUP_BADGE`, `GROUP_DOT_COLOR`, `WORKFLOW_DOT_COLOR`, `PROJ_PRIORITY_MAP` | 28–123 |
| `ProjectsTab.tsx` | `STATUS_GROUPS`, `TASK_STATUS_TO_GROUP`, `WORKFLOW_TO_GROUP`, `GROUP_ID_TO_STATUS`, `PROJ_PRIORITY_MAP` | 28–80 |
| `ProjectGroupRow.tsx` | `WORKFLOW_BADGE` | 30–36 |
| `TaskDetailPanel.tsx` | `STATUS_LABELS`, `VALID_TRANSITIONS` | 88–109 |

### Why it is a problem

The values in each copy have already drifted. `ProjectsSummaryPage.tsx` maps `revisions` into `"In Review"` group. `ProjectsTab.tsx` maps `revisions` into `"In Progress"` group. `TaskDetailPanel.tsx` includes `VALID_TRANSITIONS` that differ from the backend `constants.ts` definition. Every future status change requires 4 separate edits — and the developer must remember all 4 places.

### Before (diverging copies)

```ts
// ProjectsSummaryPage.tsx
const STATUS_GROUPS = [
  { id: 'todo',      label: 'To Do',       statuses: ['to_do'] },
  { id: 'progress',  label: 'In Progress', statuses: ['assigned', 'in_progress'] },
  { id: 'review',    label: 'In Review',   statuses: ['revisions', 'internal_review', 'client_review'] },
  ...
];

// ProjectsTab.tsx  (DIFFERENT — revisions is in progress, not review)
const STATUS_GROUPS = [
  { id: 'todo',      label: 'To Do',       statuses: ['to_do'] },
  { id: 'progress',  label: 'In Progress', statuses: ['assigned', 'in_progress', 'revisions'] },
  { id: 'review',    label: 'In Review',   statuses: ['internal_review', 'client_review'] },
  ...
];
```

### After — single source of truth

Create `frontend-new/src/lib/projectConstants.ts`:

```ts
// lib/projectConstants.ts
export const STATUS_GROUPS: StatusGroup[] = [
  { id: 'todo',      label: 'To Do',       statuses: ['to_do'] },
  { id: 'progress',  label: 'In Progress', statuses: ['assigned', 'in_progress', 'revisions'] },
  { id: 'review',    label: 'In Review',   statuses: ['internal_review', 'client_review'] },
  { id: 'completed', label: 'Completed',   statuses: ['completed'] },
  { id: 'blocked',   label: 'Blocked',     statuses: ['blocked'] },
];

export const TASK_STATUS_TO_GROUP: Record<string, string> = Object.fromEntries(
  STATUS_GROUPS.flatMap((g) => g.statuses.map((s) => [s, g.id]))
);

export const WORKFLOW_BADGE: Record<string, { label: string; style: string }> = {
  todo:        { label: 'To Do',       style: 'bg-gray-100 text-gray-500' },
  in_progress: { label: 'In Progress', style: 'bg-purple-50 text-purple-600' },
  in_review:   { label: 'In Review',   style: 'bg-yellow-50 text-yellow-700' },
  approved:    { label: 'Approved',    style: 'bg-green-50 text-green-700' },
  completed:   { label: 'Completed',   style: 'bg-gray-100 text-gray-600' },
};

export const GROUP_BADGE: Record<string, { label: string; style: string }> = {
  todo:      { label: 'To Do',       style: 'bg-gray-100 text-gray-600' },
  progress:  { label: 'In Progress', style: 'bg-blue-100 text-blue-700' },
  review:    { label: 'In Review',   style: 'bg-yellow-100 text-yellow-700' },
  completed: { label: 'Completed',   style: 'bg-green-100 text-green-700' },
  blocked:   { label: 'Blocked',     style: 'bg-red-100 text-red-700' },
};

export const STATUS_LABELS: Record<string, string> = {
  to_do:           'To Do',
  assigned:        'Assigned',
  in_progress:     'In Progress',
  revisions:       'Revisions',
  internal_review: 'Internal Review',
  client_review:   'Client Review',
  completed:       'Completed',
  blocked:         'Blocked',
};
```

Then each file becomes a one-line import:
```ts
import { STATUS_GROUPS, WORKFLOW_BADGE, STATUS_LABELS } from '../../lib/projectConstants';
```

---

## Issue 2 — `ProjectRow` Duplicates `ProjectGroupRow` (~300 Lines)

### Where it happens

`ProjectsSummaryPage.tsx` lines 127–274 define a local `ProjectRow` component.  
`ProjectGroupRow.tsx` exports `ProjectGroupRow` from lines 59–240.

Both components render:
- A project header row with expand/collapse chevron
- Workflow status badge
- Priority badge
- Member avatar stack
- Edit / delete dropdown menu
- A list of `TaskRow` children

The JSX is structurally identical with minor prop name differences.

### Why it is a problem

Any fix to the project row UI must be applied twice. The `ProjectRow` in `ProjectsSummaryPage` does not receive the latest fixes from `ProjectGroupRow` (e.g. the `end_date` display added recently). A developer working on the Summary page will never know they are working on a stale copy.

### After — single `ProjectListRow` component

```ts
// components/projects/ProjectListRow.tsx
interface ProjectListRowProps {
  project:        Project;
  tasks:          Task[];
  firm:           Firm;
  usersMap:       Map<string, User>;
  projects?:      Project[];
  groupStatus:    string;
  onProjectClick?: (projectId: string, label: string, groupStatus: string) => void;
  onEditTask?:    (task: Task) => void;
  onDeleteTask?:  (task: Task) => void;
  onAddTask?:     (projectId: string | null, status: string) => void;
  onOpenTaskDetail?: (task: Task) => void;
}

export function ProjectListRow(props: ProjectListRowProps) { ... }
```

Both `ProjectsSummaryPage` and `ProjectsTab` import from the same file:
```ts
import { ProjectListRow } from '../components/projects/ProjectListRow';
```

---

## Issue 3 — `usersMap` Without `useMemo` in `ProjectsTab`

### Where it happens

`ProjectsTab.tsx` line ~414:
```ts
const usersMap = new Map(users.map((u) => [u.id, u]));
```

### Why it is a problem

This line runs on every render of `ProjectsTab`. `usersMap` is passed as a prop to every `ProjectGroupRow` child. Because it is a new `Map` reference on each render, React's reference equality check fails — all child rows re-render even when `users` data has not changed. In a firm with 50 tasks across 10 project groups, every keystroke in a filter input triggers 10 child re-renders for free.

### After

```ts
const usersMap = useMemo(
  () => new Map(users.map((u) => [u.id, u])),
  [users],
);
```

---

## Issue 4 — `interface ConflictInfo` Defined Inside Function Body

### Where it happens

`ProjectsTab.tsx` lines 109–116:
```ts
export default function ProjectsTab({ ... }) {
  // ...
  interface ConflictInfo {          // ← TypeScript interface inside a function
    taskId: string;
    taskTitle: string;
    taskDeadline: string;
    targetProject: Project;
    newTaskDate: string;
    newProjectDate: string;
  }
  const [dateConflict, setDateConflict] = useState<ConflictInfo | null>(null);
```

### Why it is a problem

TypeScript interfaces inside function bodies are legal but confusing — they look like runtime code. They cannot be imported or reused. Any other file (e.g. a shared `useDeadlineConflict` hook) cannot reference this type without copy-pasting it.

### After

Move the interface to the module level or to a `types/` file:
```ts
// At the top of the file, before the component
interface ConflictInfo {
  taskId:         string;
  taskTitle:      string;
  taskDeadline:   string;
  targetProject:  Project;
  newTaskDate:    string;
  newProjectDate: string;
}
```

---

## Issue 5 — Conflict-Resolution Logic Copy-Pasted Across Two Files

### Where it happens

`ProjectsTab.tsx` lines 214–300: `handleProjectChange` + `handleConflictConfirm`  
`ProjectFullPage.tsx` (or `FirmDetailPage`): same two handlers re-implemented

Both functions:
1. Find target project
2. Check if task or sub-task deadline exceeds project `end_date`
3. If conflict → show modal with editable dates
4. On confirm → `updateTask` + optionally `updateProject`

### Why it is a problem

Logic drift — one copy was updated to handle sub-task deadline clamping; the other was not. When a bug is found, the developer has to remember to fix both places.

### After — `useDeadlineConflict` hook

```ts
// hooks/useDeadlineConflict.ts
interface ConflictInfo {
  taskId: string; taskTitle: string; taskDeadline: string;
  targetProject: Project; newTaskDate: string; newProjectDate: string;
}

export function useDeadlineConflict(tasks: Task[], projects: Project[]) {
  const [conflict, setConflict] = useState<ConflictInfo | null>(null);
  const [saving,   setSaving]   = useState(false);
  const updateTask    = useUpdateTask();
  const updateProject = useUpdateProject();

  const checkAndMove = async (taskId: string, projectId: string | null) => {
    const task          = tasks.find((t) => t.id === taskId);
    const targetProject = projects.find((p) => p.id === projectId);

    if (!targetProject?.end_date) {
      await updateTask.mutateAsync({ id: taskId, payload: { project_id: projectId } });
      return;
    }

    const hasConflict =
      (task?.deadline && task.deadline > targetProject.end_date) ||
      (task?.subtasks ?? []).some((s) => s.deadline && s.deadline > targetProject.end_date!);

    if (hasConflict) {
      setConflict({ taskId, taskTitle: task!.title, ... });
    } else {
      await updateTask.mutateAsync({ id: taskId, payload: { project_id: projectId } });
    }
  };

  const confirm = async () => { ... };
  const dismiss = () => setConflict(null);

  return { conflict, saving, checkAndMove, confirm, dismiss };
}
```

Usage in both pages:
```ts
const { conflict, checkAndMove, confirm, dismiss } = useDeadlineConflict(tasks, projects);
// In JSX: <DateConflictModal conflict={conflict} onConfirm={confirm} onClose={dismiss} />
```

---

## Issue 6 — `PRIORITY_MAP` / `PROJ_PRIORITY_MAP` Defined 3× Inside Component Bodies

### Where it happens

```ts
// ProjectsTab.tsx:158 (inside component function)
const PRIORITY_MAP: Record<string, 'low' | 'normal' | 'high' | 'urgent'> = {
  Low: 'low', Normal: 'normal', High: 'high', Urgent: 'urgent',
};

// ProjectsSummaryPage.tsx:119 (inside module level — another copy)
const PROJ_PRIORITY_MAP: Record<string, TaskPriority> = {
  low: 'low', normal: 'normal', high: 'high', urgent: 'urgent',
};

// ProjectGroupRow.tsx:91 — derives style inline, no shared map
```

### Why it is a problem

Two of the three `PRIORITY_MAP` instances are defined inside a component function, meaning a new object is allocated on every render. This is a minor but unnecessary GC cost that also makes the code harder to test.

### After — move to `projectConstants.ts`

```ts
// lib/projectConstants.ts
export const PRIORITY_MAP: Record<string, TaskPriority> = {
  low: 'low', Low: 'low',
  normal: 'normal', Normal: 'normal',
  high: 'high', High: 'high',
  urgent: 'urgent', Urgent: 'urgent',
};
```

---

## Issue 7 — Inline Dynamic `import()` Types Inside Function Signatures

### Where it happens

`ProjectsTab.tsx` lines 200, 343:
```ts
const openAddSubTask = (parentTask: import('../../lib/api').Task) => {
  ...
};
```

### Why it is a problem

Inline `import()` types are a last-resort escape hatch. They make code harder to read and prevent IDE rename-refactors from working correctly. The type `Task` is already imported at the top of the same file via `import type { Task } from '../../lib/api'`.

### After

```ts
// Already imported at top of file:
import type { Task, User, Project, Firm } from '../../lib/api';

// Just use it:
const openAddSubTask = (parentTask: Task) => { ... };
```

---

## Issue 8 — 6–7 Separate `useState` Calls for Filter/UI State

### Where it happens

**`ProjectsTab.tsx`** — 6 filter state variables (lines 361–368):
```ts
const [filterStatus,   setFilterStatus]   = useState<string>('');
const [filterPriority, setFilterPriority] = useState<string>('');
const [filterAssignee, setFilterAssignee] = useState<string>('');
const [filterProject,  setFilterProject]  = useState<string>('');
const [searchQuery,    setSearchQuery]    = useState('');
const [sortBy,         setSortBy]         = useState<string>('deadline');
```

**`TaskDetailPanel.tsx`** — 9 boolean UI state variables (lines 133–149):
```ts
const [saving,        setSaving]        = useState(false);
const [deadlineError, setDeadlineError] = useState('');
const [saveError,     setSaveError]     = useState('');
const [statusError,   setStatusError]   = useState('');
const [showPriority,  setShowPriority]  = useState(false);
const [showPicker,    setShowPicker]    = useState(false);
const [showProject,   setShowProject]   = useState(false);
const [showStatus,    setShowStatus]    = useState(false);
const [transitioning, setTransitioning] = useState(false);
```

### Why it is a problem

6 independent `useState` calls means 6 separate re-renders for a reset-all-filters action. More importantly, when closing a dropdown (e.g. opening Priority closes Status), you need cascading calls: `setShowStatus(false); setShowPriority(true)` — this triggers two renders. With `useReducer`, you dispatch one action and get one render.

### After — `useReducer` for filter state

```ts
// hooks/useProjectFilters.ts
type FilterState = {
  status:   string;
  priority: string;
  assignee: string;
  project:  string;
  search:   string;
  sortBy:   string;
};

type FilterAction =
  | { type: 'SET_STATUS';   value: string }
  | { type: 'SET_PRIORITY'; value: string }
  | { type: 'RESET_ALL' };

function filterReducer(state: FilterState, action: FilterAction): FilterState {
  switch (action.type) {
    case 'SET_STATUS':   return { ...state, status: action.value };
    case 'SET_PRIORITY': return { ...state, priority: action.value };
    case 'RESET_ALL':    return initialFilterState;
    default:             return state;
  }
}

export function useProjectFilters() {
  const [filters, dispatch] = useReducer(filterReducer, initialFilterState);
  return { filters, dispatch };
}
```

### After — `useReducer` for dropdown open state

```ts
// Inside TaskDetailPanel — group all "which dropdown is open" into one state
type OpenDropdown = 'priority' | 'status' | 'project' | 'picker' | null;
const [openDropdown, setOpenDropdown] = useState<OpenDropdown>(null);

// Instead of setShowPriority(true) + setShowStatus(false)
setOpenDropdown('priority');
```

---

## Issue 9 — `ProjectsSummaryPage.tsx` Is 985 Lines Doing 5 Jobs

### What the file currently contains

| Lines | Responsibility |
|-------|---------------|
| 28–123 | 9 constant objects (belongs in `projectConstants.ts`) |
| 127–274 | Local `ProjectRow` component (duplicate of `ProjectGroupRow`) |
| 278–410 | Local `ProjectStatusSection` component (duplicate of `StatusSection`) |
| 412–740 | Page state (12 `useState`, 6 event handlers, derived data) |
| 742–985 | JSX return (~240 lines) |

### Why it is a problem

A single file doing layout, logic, data derivation, and defining two complete sub-components is the most common source of merge conflicts on the team. When two people edit the same 985-line file simultaneously, the diff is impossible to review meaningfully.

### After — split into 4 files

```
pages/projects/
  ProjectsSummaryPage.tsx     ← 150 lines: page state + JSX shell only
  useProjectsSummary.ts       ← 120 lines: all data fetching + derived state
components/projects/
  ProjectListRow.tsx           ← shared between Summary + Tab (replaces both local copies)
  ProjectStatusSection.tsx     ← shared between Summary + Tab
lib/
  projectConstants.ts          ← all constants
```

Result: each file has a single clear job. PR reviews are focused.

---

## Issue 10 — `StatusDot` SVG Re-Drawn Inline

### Where it happens

`ProjectsSummaryPage.tsx` (multiple places) and inside `ProjectsTab.tsx` render an inline SVG circle instead of using the exported `StatusDot` component from `TaskRow.tsx`.

```tsx
{/* Inline — bad */}
<span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: GROUP_DOT_COLOR[group.id] }} />

{/* Correct — use the exported component */}
import { StatusDot } from '../tasks/TaskRow';
<StatusDot status={task.status} />
```

### Why it is a problem

When the design wants to change the status dot size from `w-2 h-2` to `w-2.5 h-2.5`, the developer has to find and update every inline instance instead of changing one component.

---

## Issue 11 — `VALID_TRANSITIONS` Defined Locally in `TaskDetailPanel`

### Where it happens

`TaskDetailPanel.tsx` lines 100–109:
```ts
const VALID_TRANSITIONS: Record<string, string[]> = {
  to_do:           ['assigned', 'in_progress', 'blocked'],
  assigned:        ['in_progress', 'blocked'],
  in_progress:     ['revisions', 'internal_review', 'blocked'],
  revisions:       ['in_progress'],
  internal_review: ['client_review', 'revisions'],
  client_review:   ['completed', 'revisions'],
  completed:       [],
  blocked:         ['to_do', 'in_progress'],
};
```

The backend already defines `VALID_TRANSITIONS` in `backend/src/config/constants.ts`. The frontend version already differs — `client_review` allows `completed` on the frontend but the backend only allows `completed` after `client_review`. This means the UI enables a transition the API will reject.

### After

Export `VALID_TRANSITIONS` from `lib/projectConstants.ts` (derived from the same source as the backend). At minimum, move it out of the component so it is defined once:

```ts
// lib/projectConstants.ts
export const VALID_TRANSITIONS: Record<string, string[]> = {
  to_do:           ['assigned', 'in_progress', 'blocked'],
  assigned:        ['in_progress', 'blocked'],
  in_progress:     ['revisions', 'internal_review', 'blocked'],
  revisions:       ['in_progress'],
  internal_review: ['client_review', 'revisions'],
  client_review:   ['completed', 'revisions'],
  completed:       [],
  blocked:         ['to_do', 'in_progress'],
};
```

---

## Issue 12 — Timer + Timesheet Block Copy-Pasted Verbatim Across Two Files

### Where it happens

**`TaskDetailPanel.tsx` lines 586–633** — Timer/Timesheet section  
**`TaskDetailPage.tsx` lines 224–271** — identical Timer/Timesheet section

Both blocks contain:
```tsx
// Start/stop timer button with red stop square + purple clock
<button
  disabled={startTimer.isPending || stopTimer.isPending}
  onClick={() => isTimerRunningHere
    ? stopTimer.mutate({ entryId: running!.entryId })
    : startTimer.mutate()
  }
  className={`...${isTimerRunningHere ? 'border-red bg-red...' : 'border-gray bg-white...'}`}
>
  {isTimerRunningHere ? <span className="w-2.5 h-2.5 ..." /> : <Clock ... />}
</button>
{/* Log Time text button that opens TimesheetPanel */}
<button onClick={() => setShowTimesheet((v) => !v)}>Log Time</button>
<TimesheetPanel ... />
{/* Running elapsed time indicator */}
{isTimerRunningHere && (
  <div><span className="...animate-pulse" /><span>{formatElapsed(elapsed)}</span></div>
)}
```

The only difference is button sizing (`w-7 h-7` in Panel vs `w-6 h-6` in Page).

### After — `TaskTimerRow` component

```tsx
// components/tasks/TaskTimerRow.tsx
interface TaskTimerRowProps {
  taskId:   string;
  size?:    'sm' | 'md';   // sm = page grid, md = panel
}

export function TaskTimerRow({ taskId, size = 'md' }: TaskTimerRowProps) {
  const [showTimesheet, setShowTimesheet] = useState(false);
  const timesheetBtnRef = useRef<HTMLDivElement>(null);
  const { running, elapsed } = useTimer();
  const isRunning = running?.taskId === taskId;
  const startTimer = useStartTimer(taskId);
  const stopTimer  = useStopTimer(taskId);

  const btnSize = size === 'sm' ? 'w-6 h-6' : 'w-7 h-7';

  return (
    <div ref={timesheetBtnRef} className="relative flex items-center gap-2">
      <button onClick={...} className={`... ${btnSize} ...`}>
        {isRunning ? <span className="w-2.5 h-2.5 ..." /> : <Clock ... />}
      </button>
      <button onClick={() => setShowTimesheet((v) => !v)}>Log Time</button>
      <TimesheetPanel taskId={taskId} open={showTimesheet} onClose={() => setShowTimesheet(false)} anchorRef={timesheetBtnRef} />
      {isRunning && (
        <div><span className="...animate-pulse" /><span>{formatElapsed(elapsed)}</span></div>
      )}
    </div>
  );
}
```

Both files then become:
```tsx
<TaskTimerRow taskId={task.id} size="md" />   // in TaskDetailPanel
<TaskTimerRow taskId={task.id} size="sm" />   // in TaskDetailPage
```

---

## Issue 13 — `TimesheetPanel` and `ProjectTimesheetPanel` Are 95% Identical

### Where it happens

`TimesheetPanel.tsx` — 277 lines — handles task-level time entries  
`ProjectTimesheetPanel.tsx` — ~280 lines — handles project-level time entries

Both files have:
- Identical `useState` declarations (lines 32–39)
- Identical outside-click handler `useEffect` (lines 49–59)
- Identical `handleSave` async function (lines 61–88)
- Identical `<TimeInputField>`, `<DateTimeRangeRow>`, notes textarea, billable toggle JSX
- Identical `<TimeEntriesList>` + subtask section
- The only real differences: which hooks are called (`useTimeEntries` vs `useProjectTimeEntries`) and the `messagesApi.create` scope

### After — `BaseTimesheetPanel` + two thin wrappers

```ts
// components/timesheet/BaseTimesheetPanel.tsx
interface BaseTimesheetPanelProps {
  open:          boolean;
  onClose:       () => void;
  anchorRef?:    React.RefObject<HTMLElement | null>;
  summary?:      TimeEntrySummary;
  isRunning:     boolean;
  onStartTimer:  () => void;
  onStopTimer:   (description?: string) => void;
  onSave:        (payload: TimeEntryPayload) => Promise<void>;
  onDelete:      (entryId: string) => void;
  startPending:  boolean;
  stopPending:   boolean;
  savePending:   boolean;
}

export function BaseTimesheetPanel(props: BaseTimesheetPanelProps) {
  // All the shared state + JSX lives here — 180 lines
}

// components/timesheet/TimesheetPanel.tsx  — 40 lines total
export default function TimesheetPanel({ taskId, projectId, ...rest }) {
  const { data: summary } = useTimeEntries(rest.open ? taskId : undefined);
  const startTimer = useStartTimer(taskId);
  // ... pass callbacks to BaseTimesheetPanel
  return <BaseTimesheetPanel summary={summary} ... />;
}

// components/timesheet/ProjectTimesheetPanel.tsx  — 40 lines total
export default function ProjectTimesheetPanel({ projectId, ...rest }) {
  const { data: summary } = useProjectTimeEntries(rest.open ? projectId : undefined);
  const startTimer = useStartProjectTimer(projectId);
  // ... pass callbacks to BaseTimesheetPanel
  return <BaseTimesheetPanel summary={summary} ... />;
}
```

Total reduction: ~300 lines removed from the codebase.

---

## Issue 14 — `AssigneePickerDropdown` Positions Itself via a Duplicated `useEffect`

### Where it happens

`AssigneePickerDropdown.tsx` lines 32–59:
```ts
useEffect(() => {
  if (!open) { setSearch(''); return; }
  const el = anchorRef.current;
  if (!el) return;
  const rect   = el.getBoundingClientRect();
  const MARGIN = 8;
  const GAP    = 4;
  const SEARCH_H = 53;

  const left = Math.max(MARGIN, Math.min(rect.right - width, window.innerWidth - width - MARGIN));

  const spaceBelow = window.innerHeight - rect.bottom - GAP - MARGIN;
  const spaceAbove = rect.top - GAP - MARGIN;
  const goAbove    = spaceBelow < 140 && spaceAbove > spaceBelow;
  const maxTotalH  = Math.min(320, goAbove ? spaceAbove : spaceBelow);
  const maxListH   = Math.max(60, maxTotalH - SEARCH_H);
  const top        = goAbove ? rect.top - GAP - maxTotalH : rect.bottom + GAP;

  setPos({ top, left, maxListH });
  requestAnimationFrame(() => inputRef.current?.focus());
}, [open, users.length, width]);
```

This same anchor-relative positioning logic is also written inline in `ProjectAssigneePanel` and similar floating panels. Additionally `TimesheetPanel.tsx` and `ProjectTimesheetPanel.tsx` each have their own manual `useEffect` for outside-click detection instead of using the existing `useClickOutside` hook.

### After — `useAnchoredPanel` hook

```ts
// hooks/useAnchoredPanel.ts
interface PanelPos { top: number; left: number; maxListH: number }

export function useAnchoredPanel(
  open: boolean,
  anchorRef: React.RefObject<HTMLElement | null>,
  opts: { width?: number; searchBarH?: number; minListH?: number } = {}
): PanelPos | null {
  const [pos, setPos] = useState<PanelPos | null>(null);
  const { width = 240, searchBarH = 53, minListH = 60 } = opts;

  useEffect(() => {
    if (!open) return;
    const el = anchorRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const M = 8, G = 4;
    const left        = Math.max(M, Math.min(rect.right - width, window.innerWidth - width - M));
    const spaceBelow  = window.innerHeight - rect.bottom - G - M;
    const spaceAbove  = rect.top - G - M;
    const goAbove     = spaceBelow < 140 && spaceAbove > spaceBelow;
    const maxTotalH   = Math.min(320, goAbove ? spaceAbove : spaceBelow);
    const maxListH    = Math.max(minListH, maxTotalH - searchBarH);
    const top         = goAbove ? rect.top - G - maxTotalH : rect.bottom + G;
    setPos({ top, left, maxListH });
  }, [open, anchorRef, width, searchBarH, minListH]);

  return open ? pos : null;
}
```

`AssigneePickerDropdown` then uses this hook:
```ts
const pos = useAnchoredPanel(open, anchorRef, { width, searchBarH: 53 });
```

---

## Issue 15 — SQL Injection Risk in `projects.service.ts`

### Where it happens

`backend/src/modules/projects/projects.service.ts` line ~215:
```ts
// DANGEROUS: string interpolation directly into SQL
await sequelize.query(
  `DELETE FROM projects WHERE id = '${id}' AND (
     SELECT id FROM tickets WHERE project_id = '${id}'
   ) IS NULL`,
  { type: QueryTypes.SELECT }
);
```

Or more precisely, the `sequelize.literal()` call:
```ts
where: {
  id,
  [Op.and]: sequelize.literal(
    `(SELECT id FROM tickets WHERE project_id = '${id}')`
  )
}
```

### Why it is a problem

`id` comes from `req.params.id` via the controller. If the middleware does not enforce UUID format, a crafted value like `' OR 1=1--` could modify the query. The Sequelize literal is not parameterized.

### After — use parameterized query

```ts
// Use Sequelize replacements — never string interpolation in SQL
const [result] = await sequelize.query(
  `SELECT COUNT(*) AS cnt FROM tickets WHERE project_id = :projectId`,
  { replacements: { projectId: id }, type: QueryTypes.SELECT }
) as [{ cnt: string }];

if (parseInt(result.cnt) > 0) {
  throw new Error('Cannot delete project with existing tasks');
}
await Project.destroy({ where: { id } });
```

---

## Issue 16 — `getProjectOverview()` Uses Wrong Status Schema

### Where it happens

`backend/src/modules/projects/projects.service.ts` lines 234–244:
```ts
const getProjectOverview = async (projectId: string) => {
  const statusGroups = {
    todo:      ['draft', 'to_do'],         // ← 'draft' does not exist in new schema
    progress:  ['in_progress', 'assigned'],
    review:    ['internal_review', 'client_review', 'compliance_review'],  // ← 'compliance_review' does not exist
    completed: ['approved', 'closed', 'completed'],                        // ← 'approved', 'closed' do not exist
    blocked:   ['blocked', 'discarded'],                                   // ← 'discarded' does not exist
  };
  // ...
};
```

The task schema migrated from the old 10-status workflow (`draft`, `in_progress`, `resolved`, `internal_review`, `client_review`, `compliance_review`, `approved`, `closed`, `revisions`, `discarded`) to the new 8-status workflow (`to_do`, `assigned`, `in_progress`, `revisions`, `internal_review`, `client_review`, `completed`, `blocked`). The backend service was not updated.

### Why it is a problem

Any task with status `completed` or `blocked` is silently dropped into the wrong bucket. The overview counts shown on `FirmDetailPage` are wrong.

### After — align with `VALID_STATUSES` from `constants.ts`

```ts
import { VALID_STATUSES } from '../../config/constants';

const STATUS_GROUPS: Record<string, string[]> = {
  todo:      ['to_do'],
  progress:  ['assigned', 'in_progress', 'revisions'],
  review:    ['internal_review', 'client_review'],
  completed: ['completed'],
  blocked:   ['blocked'],
};

// Validate at startup that STATUS_GROUPS covers all VALID_STATUSES
const allGrouped = Object.values(STATUS_GROUPS).flat();
const missing = VALID_STATUSES.filter((s) => !allGrouped.includes(s));
if (missing.length > 0) {
  logger.warn('[projects.service] STATUS_GROUPS missing statuses:', missing);
}
```

---

## Issue 17 — `tasks.service.ts` Returns `unknown[]` and `Promise<unknown | null>`

### Where it happens

`backend/src/modules/tasks/tasks.service.ts` line 127:
```ts
export interface PaginatedTasksResult {
  data:  unknown[];   // ← loses all type information
  total: number;
  page:  number;
  limit: number;
}
```

Line 330:
```ts
export async function findTaskById(id: string): Promise<unknown | null> {
  // ...
}
```

Line 97–111:
```ts
async function assigneeCondition(user: User) {
  if (user.role === 'member') {
    // Fires a DB query on EVERY member list call:
    const { data } = await supabase.from('task_assignees').select('task_id').eq('user_id', user.id);
    return data?.map((r) => r.task_id) ?? [];
  }
  return null;
}
```

### Why it is a problem

`unknown[]` means every controller that calls `findAllTasks()` must cast: `(result.data as Task[])`. This erases the TypeScript compiler's ability to catch property typos. The `assigneeCondition` function fires one extra DB query for every `GET /api/tasks` call by a member user — this is `N+1` per request.

### After — typed return + pre-JOIN instead of sub-query

```ts
// Use the domain type imported from types/index.ts
export interface PaginatedTasksResult {
  data:  Task[];
  total: number;
  page:  number;
  limit: number;
}

export async function findTaskById(id: string): Promise<Task | null> {
  const row = await Ticket.findOne({
    where: { id },
    include: [...],
    raw: false,
  });
  return row ? (row.toJSON() as Task) : null;
}

// Eliminate assigneeCondition — include it in the main query
// via a JOIN on task_assignees instead of a separate query
```

---

## Issue 18 — `console.log` in Production Code

### Where it happens

`ProjectGroupRow.tsx` line 87:
```ts
console.log('[ProjectGroupRow]', project?.name, {
  end_date: project?.end_date,
  start_date: project?.start_date,
  priority: project?.priority
});
```

### After

Delete the line. Use the backend's `logger` (Pino) if debugging is needed. In frontend, use browser devtools breakpoints — never ship `console.log` calls.

---

## Issue 19 — Outside-Click Re-Implemented Inline in `TimesheetPanel`

### Where it happens

`TimesheetPanel.tsx` lines 49–59 and `ProjectTimesheetPanel.tsx` lines 52–62:
```ts
useEffect(() => {
  if (!open) return
  function handler(e: MouseEvent) {
    if (
      panelRef.current && !panelRef.current.contains(e.target as Node) &&
      (!anchorRef?.current || !anchorRef.current.contains(e.target as Node))
    ) { onClose() }
  }
  document.addEventListener('mousedown', handler)
  return () => document.removeEventListener('mousedown', handler)
}, [open, onClose, anchorRef])
```

The project already has `hooks/useClickOutside.ts` for exactly this purpose.

### After

```ts
useClickOutside(panelRef, () => {
  if (anchorRef?.current?.contains(document.activeElement)) return;
  onClose();
});
```

---

## Issue 20 — Sub-Task Priority Badge Duplicated Inline in `TaskDetailPanel`

### Where it happens

`TaskDetailPanel.tsx` lines 564–571:
```tsx
<span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold shrink-0 ${
  sub.priority === 'urgent' ? 'bg-red-100 text-red-600'
  : sub.priority === 'high' ? 'bg-orange-100 text-orange-600'
  : sub.priority === 'normal' ? 'bg-yellow-100 text-yellow-600'
  : 'bg-green-100 text-green-600'
}`}>
  {sub.priority === 'normal' ? 'Normal' : sub.priority ? sub.priority.charAt(0).toUpperCase() + sub.priority.slice(1) : ''}
</span>
```

The project already has `<PriorityBadge priority={...} />` exported from `components/tasks/TaskBadges.tsx`.

### After

```tsx
import { PriorityBadge } from './TaskBadges';
// ...
<PriorityBadge priority={sub.priority} />
```

---

## Proposed Refactoring Roadmap

The issues above can be addressed in three passes with minimal risk of regressions.

### Pass 1 — Zero-Risk Cleanups (1–2 hours)

These changes have no behaviour change — purely moving/deleting code.

| Action | Files |
|--------|-------|
| Delete `console.log` | `ProjectGroupRow.tsx:87` |
| Replace inline priority badge with `<PriorityBadge>` | `TaskDetailPanel.tsx:564` |
| Replace inline `StatusDot` SVG with `<StatusDot>` | `ProjectsSummaryPage.tsx` |
| Move `interface ConflictInfo` to module level | `ProjectsTab.tsx:109` |
| Replace inline dynamic `import()` type with top-level import | `ProjectsTab.tsx:200,343` |
| Replace `TimesheetPanel` inline outside-click with `useClickOutside` | `TimesheetPanel.tsx`, `ProjectTimesheetPanel.tsx` |

### Pass 2 — Shared Constants + Performance Fixes (2–3 hours)

| Action | Files |
|--------|-------|
| Create `lib/projectConstants.ts` with all status/badge/priority constants | New file |
| Replace all 4 copies of `STATUS_GROUPS`, `WORKFLOW_BADGE` etc. with imports | 4 files |
| Add `useMemo` to `usersMap` | `ProjectsTab.tsx:414` |
| Move `VALID_TRANSITIONS` out of `TaskDetailPanel` into `projectConstants.ts` | `TaskDetailPanel.tsx:100` |
| Fix `getProjectOverview()` status groups to use new 8-status schema | `projects.service.ts:234` |
| Fix `sequelize.literal()` SQL injection → use parameterized replacement | `projects.service.ts:215` |

### Pass 3 — Component Extraction (4–6 hours)

| Action | Output |
|--------|--------|
| Create `TaskTimerRow` component | Removes ~50 duplicate lines across 2 files |
| Create `BaseTimesheetPanel` + refactor both timesheet files | Removes ~240 duplicate lines |
| Create `useDeadlineConflict` hook | Removes duplicate conflict logic across 2 pages |
| Extract `useProjectFilters` with `useReducer` | Cleaner filter state in `ProjectsTab` |
| Create `ProjectListRow` (merge `ProjectRow` + `ProjectGroupRow`) | Removes ~300 duplicate lines |
| Split `ProjectsSummaryPage.tsx` into 4 files | 985-line file → 4 focused files |

### Expected Outcome

| Metric | Before | After |
|--------|--------|-------|
| Duplicate constant definitions | 4 copies in 4 files | 1 copy in `projectConstants.ts` |
| Largest single file | 985 lines | ~200 lines |
| Duplicate component code | ~600 lines | 0 lines |
| SQL injection surfaces | 1 | 0 |
| Wrong status schema in backend | 1 function | Fixed |
| `unknown[]` return types | 2 service functions | Typed `Task[]` |
| Inline `console.log` | 1 | 0 |
