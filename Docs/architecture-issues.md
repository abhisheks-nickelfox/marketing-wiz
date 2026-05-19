# Frontend Architecture Issues & Refactoring Plan

> **Scope:** `frontend-new/src/` — ProjectFullPage, TaskDetailPanel, MyTasksPage,
> ProjectsSummaryPage, chat, timer, hooks, calendar, double-click, assignee pickers.
> **Goal:** Document every duplication and architecture smell so they can be fixed systematically.

---

## 1. Duplicated Constants

### 1.1 `TASK_STATUS_BADGE` — defined twice, field name mismatch

| File | Field name |
|------|-----------|
| `components/tasks/TaskRow.tsx:66` | `{ label, style }` |
| `lib/constants.ts:45` | `{ label, className }` |

Both map the same 12 statuses. Any consumer must know which file to import from, and the field name differs (`style` vs `className`). Several files import from `TaskRow` when they should import from `constants`.

**Fix:** Remove the definition from `TaskRow.tsx`, keep one canonical version in `lib/constants.ts` with `style` as the field name, update all imports.

---

### 1.2 `PRIORITY_BADGE` — same issue

| File | Field name |
|------|-----------|
| `components/tasks/TaskRow.tsx:52` | plain class string |
| `lib/constants.ts:61` | `{ label, className }` |

**Fix:** Same as above — single source in `lib/constants.ts`.

---

### 1.3 Status label maps — three separate local copies

| Constant | File | Notes |
|----------|------|-------|
| `STATUS_LABELS` | `lib/projectConstants.ts:11` | Canonical |
| `STATUS_GROUP_LABEL` | `pages/tasks/MyTasksPage.tsx:77` | Exact duplicate, local only |
| `WORKFLOW_LABEL` | `pages/projects/ProjectFullPage.tsx:41` | Subset duplicate, not shared |
| `WORKFLOW_TO_KEY` | `pages/projects/ProjectFullPage.tsx:51` | Inverse of above, not shared |

**Fix:** Move `STATUS_GROUP_LABEL`, `STATUS_GROUP_ORDER`, `WORKFLOW_LABEL`, and `WORKFLOW_TO_KEY` into `lib/projectConstants.ts`.

---

### 1.4 `priorityMap` — inline in every create handler

Every page that calls `createTask` contains:
```ts
const priorityMap: Record<string, 'low' | 'normal' | 'high' | 'urgent'> = {
  Low: 'low', Normal: 'normal', High: 'high', Urgent: 'urgent',
};
```
Found in: `ProjectFullPage.tsx`, `MyTasksPage.tsx`, `ProjectsTab.tsx`.

**Fix:** Export `PRIORITY_MAP` from `lib/constants.ts`.

---

## 2. Duplicated State — Form Components

Every form/panel component independently declares 10–16 `useState` calls with no abstraction. Summary:

| Component | useState count | Pattern |
|-----------|---------------|---------|
| `TaskDetailPanel.tsx` | 15 | form fields + 4 dropdown opens + 3 error states + saving + transitioning |
| `ProjectDetailPanel.tsx` | 13 | form fields + 3 dropdown opens + 2 error states + saving |
| `ProjectFullPage.tsx` | 8 | panels/modals open + selected task + parent task state |
| `ProjectsSummaryPage.tsx` | 10 | view mode + selected items + modal states |
| `AddTaskModal.tsx` | 4+ | dropdown opens + files |
| `MyTasksPage.tsx` | 5 | selected task + add modal + parent state + search |

### 2.1 Dropdown open state pattern — copy-pasted everywhere

```ts
// In TaskDetailPanel (4 times), ProjectDetailPanel (3 times), AddTaskModal (3 times):
const [showPriority, setShowPriority] = useState(false);
const priorityRef = useRef<HTMLDivElement>(null);
useClickOutside(priorityRef, () => setShowPriority(false));
```

**Fix:** A single `useDropdown()` hook:
```ts
function useDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false));
  return { open, ref, toggle: () => setOpen(v => !v), close: () => setOpen(false) };
}
```
This alone removes ~40 lines of repeated state+ref+useClickOutside triples.

### 2.2 Add-subtask parent state — duplicated in two pages

```ts
// Exact same 3-state block in ProjectFullPage AND MyTasksPage:
const [showAddSubTask,        setShowAddSubTask]        = useState(false);
const [subTaskParentId,       setSubTaskParentId]       = useState<string | undefined>();
const [subTaskParentDeadline, setSubTaskParentDeadline] = useState<string | undefined>();
```

**Fix:** Extract `useAddSubTaskState()` hook.

---

## 3. Duplicated Handler Logic

### 3.1 `handleSaveTask` — 4 implementations

| File | Extra logic |
|------|------------|
| `ProjectFullPage.tsx` | + deadline clamping for sub-tasks |
| `MyTasksPage.tsx` | basic only |
| `ProjectsTab.tsx` | basic only |
| `TaskDetailPage.tsx` | basic only |

All four build the same `updateTask.mutateAsync` payload. Only `ProjectFullPage` adds the sub-task deadline clamp — which **all** the others should also have but don't.

**Fix:** Extract a `saveTaskWithSubtaskClamp(taskId, data, allTasks, updateTask)` utility function so the clamping logic can't fall out of sync.

---

### 3.2 `handleCreateTask` / `handleCreateSubTask` — 3 implementations

The payload shape is identical across `ProjectFullPage`, `MyTasksPage`, and `ProjectsTab`. The only differences are how `firmId` is resolved and whether `parent_task_id` is set.

**Root cause:** `AddTaskModal` does not return `firmId` in `TaskFormData` — every caller must resolve it externally, leading to 3 different resolution strategies:
- `ProjectFullPage`: from URL params
- `MyTasksPage`: from `appliedFilter.firmIds[0]` or `firms[0]`
- `ProjectsTab`: passed as prop

**Fix:** Add `firmId` to `TaskFormData` (or as a prop `defaultFirmId` on `AddTaskModal`) and return it in `onCreate`, so callers don't need their own resolution logic.

---

## 4. Component Duplication

### 4.1 Assignee picker — three implementations

| Component | Used in | Mechanism |
|-----------|---------|-----------|
| `AssigneePicker.tsx` | `AddTaskModal`, `AddProjectModal` | Self-contained; computes position via `getBoundingClientRect` manually |
| `AssigneePickerDropdown.tsx` | `TaskRow`, `TaskDetailPanel`, `ProjectGroupRow`, 8 others | Just the dropdown; uses `useAnchoredPanel` hook for positioning |
| `InlineAssigneePicker.tsx` | `SubTaskRow`, `ProjectFullPage` members | Wraps `AvatarStack + AssigneePickerDropdown` with internal open state |

Problems:
- `AssigneePicker` uses manual position math; `AssigneePickerDropdown` uses `useAnchoredPanel`. Two positioning strategies for the same visual result.
- `TaskDetailPanel` uses `AssigneePickerDropdown` directly with a manual `ref` + `useState(false)` — ignoring `InlineAssigneePicker` which already encapsulates this.
- `AssigneePicker` (forms) and `InlineAssigneePicker` (tables) solve the same problem at different abstraction levels.

**Fix:** Standardise on `InlineAssigneePicker`. Migrate `AssigneePicker` to use `useAnchoredPanel` internally or replace with `InlineAssigneePicker`.

---

### 4.2 `SubTaskRow` — shared component exists but was ignored

`components/tasks/SubTaskRow.tsx` is the correct shared component.
Before recent fixes, `ProjectFullPage` had two local copies (`SubTaskRow` + `NestedSubTaskRow`) — **now fixed.**
`TaskDetailPage.tsx` uses the shared component correctly.
`TaskDetailPanel.tsx` renders subtasks as a plain list (lines 501–536) — a third variant that bypasses the shared component.

**Remaining fix:** `TaskDetailPanel` subtask list could use `SubTaskRow` with `isNested` for visual consistency.

---

### 4.3 Status section header — two implementations

| Component | File |
|-----------|------|
| `StatusSection` (with `+` add button, project view/task view, load-more) | `ProjectGroupRow.tsx:255` |
| `StatusGroup` (simpler, tasks only) | `MyTasksPage.tsx:134` |

`StatusGroup` in `MyTasksPage` was recently updated to match `StatusSection` visual styling, but it remains a separate component. The two are not easily merged because `StatusSection` handles both project-view and task-view modes. The local `StatusGroup` is justified for now.

---

## 5. Hook Issues

### 5.1 Hooks fetching the same data

| Hook | Difference |
|------|-----------|
| `useFirms()` | All firms |
| `useProjects()` | All projects (no filter) |
| `useProjects(firmId)` | Projects for one firm |

`ProjectsSummaryPage` calls `useProjects()` with no firmId. `ProjectFullPage` calls `useProjects(firmId)`. Both cache under different query keys — correct behaviour, but it means loading the same projects twice in pages that show both.

---

### 5.2 `useActiveUsers` — good, but not used consistently

`useActiveUsers()` filters `useUsers()` to `status !== 'Disabled'`. This is the correct hook to use everywhere a user picker is shown. However, `ProjectFullPage` calls `useActiveUsers()` (correct) while some other spots call `useUsers()` directly.

**Fix:** Audit all user hook usages; replace `useUsers()` with `useActiveUsers()` wherever a picker is shown.

---

### 5.3 No shared `useTaskSave` hook

`handleSaveTask` logic is repeated 4 times. Should be:
```ts
function useTaskSave(allTasks: Task[]) {
  const updateTask = useUpdateTask();
  async function saveTask(taskId: string, data: TaskDetailData) {
    await updateTask.mutateAsync({ id: taskId, payload: { ... } });
    // deadline clamp for sub-tasks
    if (data.deadline) { ... }
  }
  return { saveTask };
}
```

---

## 6. Calendar & Date Components

### 6.1 Calendar components exist but are not used in task/project forms

Files found:
- `components/ui/CalendarPicker.tsx`
- `components/ui/DateRangePicker.tsx`
- `components/ui/TimeFilterBar.tsx`
- `components/ui/DateTimeRangeRow.tsx`

All task and project deadline fields use native `<input type="date">` instead of these components.

**Situation:** Native date inputs are functional but visually inconsistent with the design system. The calendar components exist but are unused in the main task flows.

**Decision needed:** Either adopt `CalendarPicker` for task/project deadline fields, or remove the unused calendar components to reduce bundle size.

---

### 6.2 Date formatting — spread across multiple files

| Function | File |
|----------|------|
| `formatDeadline(deadline)` | `components/tasks/TaskRow.tsx:82` |
| `formatTime(iso)` | inside `ChatTab.tsx` |
| `formatDateLabel(date)` | inside `ChatTab.tsx` |
| `formatSeconds(s)` | `lib/timeUtils.ts` |
| `formatElapsed(ms)` | `lib/timeUtils.ts` |
| `formatDate(iso)` | `lib/api.ts` (legacy) |

`formatDeadline` is exported from `TaskRow.tsx` — a task UI component — and imported by `SubTaskRow.tsx`. A formatting utility living in a UI component is wrong.

**Fix:** Move `formatDeadline` to `lib/timeUtils.ts` or `lib/formatters.ts`. Have `TaskRow.tsx` import it from there.

---

## 7. Double-Click Implementation

`useDoubleClick(onSingle, onDouble)` in `hooks/useDoubleClick.ts` — **well implemented.**

- Uses a 300ms timer; fires `onSingle` on timeout or `onDouble` immediately on second click.
- Used in exactly 3 places: `TaskRow`, `SubTaskRow`, `ProjectGroupRow`.
- Consistent behaviour: single-click = open detail panel, double-click = navigate to full page.

**No issues.** Pattern is clean and consistent.

---

## 8. Timer Architecture

`TimerContext.tsx` — **well designed.**

- Single global running timer (not per-task).
- Persisted to `localStorage` so it survives page refresh.
- `elapsed` auto-updates via `setInterval(100ms)`.
- Consumed by `TaskTimerRow` (task-level) and `ProjectTimesheetPanel` (project-level).

**Minor issue:** `useStartProjectTimer` sets `taskId: ''` and `taskTitle: ''` — empty strings as sentinel values. Using `taskId?: string` (optional) would be cleaner.

**Hooks:**

| Hook | File |
|------|------|
| `useStartTimer(taskId)` | `useTimeEntries.ts` |
| `useStopTimer(taskId)` | `useTimeEntries.ts` |
| `useStartProjectTimer(projectId)` | `useTimeEntries.ts` |
| `useStopProjectTimer(projectId)` | `useTimeEntries.ts` |
| `useProjectTimeEntries(projectId)` | `useTimeEntries.ts` |

All hooks correctly integrate with `TimerContext`. No duplication.

---

## 9. Chat Architecture

`ChatTab` uses `scope` + `scopeId` pattern — **well encapsulated.**

```tsx
<ChatTab scope="project" scopeId={projectId} />   // ProjectFullPage
<ChatTab scope="task"    scopeId={taskId}    />   // TaskDetailPanel (inside ChatSection wrapper)
```

`ChatSection` in `TaskDetailPanel` is a thin collapsible wrapper around `ChatTab`. This is fine.

**Minor issue:** `ActivityPanel` in `ProjectFullPage` (lines 65–109) wraps `ChatTab` with a tab switcher for "Recent / Files & Links / Notes". The "Files & Links" and "Notes" tabs show `EmptyState` — they are **stub UI**, not implemented. Remove or build them.

---

## 10. SlideOver Usage

`SlideOver` is consistently used for all side panels. Width is set per-consumer:

| Consumer | Width |
|----------|-------|
| `TaskDetailPanel` | `max-w-[440px]` |
| `ProjectDetailPanel` | `max-w-[480px]` |
| `AddTaskModal` | `max-w-[680px]` |
| Filter panels | `max-w-[380px]` |

No issues — width variation is intentional. SlideOver itself is clean.

---

## 11. `ProjectFullPage` — State Audit

```
useState calls:     8
useRef calls:       2 (timesheetBtnRef, was 3 before assigneePickerRef removed)
useQuery calls:     2 (project detail, task list via useTasksByFirm)
TanStack hooks:     5 (createTask, updateTask, updateProject, startTimer, stopTimer)
Child panels:       4 (TaskDetailPanel, AddTaskModal, ProjectDetailPanel, ProjectTimesheetPanel)
```

**Remaining smell:** `actionsOpen` (the Actions dropdown) is managed with raw `useState` + no click-outside. Clicking outside the dropdown does not close it — user must click the button again. Should use `useDropdown()` once that hook exists.

---

## 12. `TaskDetailPanel` — State Audit

```
useState calls:     15
useRef calls:       5
useClickOutside:    3 (priority, project, status — but NOT picker, documented)
Child components:   AttachmentsSection (via ref), AssigneePickerDropdown, ChatSection
```

**Issues:**
- 4 dropdown states (`showPriority`, `showPicker`, `showProject`, `showStatus`) + 4 refs = 8 declarations for 4 dropdowns. `useDropdown()` would cut this to 4 calls.
- Deadline validation logic (`parentTaskDeadline`, `proj.end_date` clamp) is duplicated from `AddTaskModal`. Should be a shared `validateDeadline(deadline, parentDeadline?, projectEndDate?)` utility.

---

## 13. `MyTasksPage` — State Audit

```
useState calls:     5 (+ filter state via usePendingFilter)
Hooks:              usePendingFilter, useMyTasks, useActiveUsers, useFirms, useUpdateTask,
                    useDeleteTask, useCreateTask
```

**Clean page.** Only issue: `onAssigneeChange` passes a single `assigneeId` string to `updateTask` with payload `{ assignee_id: assigneeId }` (singular), while all other pages use `assignee_ids` (array). This is inconsistent with the backend contract.

---

## 14. `ProjectsSummaryPage` — State Audit

```
useState calls:     10
Hooks:              usePendingFilter, useFirms, useProjects, useProjectGrouping (custom)
```

**Clean since recent refactor.** Uses `usePendingFilter`, `useProjectGrouping`, `FilterTriggerButton`, `TabToggle`, `SearchPickerModal` — all extracted correctly.

Minor: `const [search] = useState('')` at line ~176 — setter is missing, so search is hardcoded to `''`. Either remove the state (use a regular variable) or add the setter and wire it to an input.

---

## 15. Priority Refactoring Order

### Do now (high value, low risk) — ALL DONE
1. ~~Consolidate `TASK_STATUS_BADGE` and `PRIORITY_BADGE` to `lib/constants.ts`~~ — **DONE**: constants.ts updated to `style` field; all consumers re-pointed; local copy in `ProjectSummaryPanel` removed
2. ~~Move `formatDeadline` to `lib/timeUtils.ts`~~ — **DONE**: added to timeUtils; `SubTaskRow`, `ProjectGroupRow`, `SummaryProjectRow`, `useTaskDetail` all updated
3. ~~Centralize `STATUS_GROUP_LABEL`, `STATUS_GROUP_ORDER`, `WORKFLOW_LABEL`, `WORKFLOW_TO_KEY`, `priorityMap`~~ — **DONE**: all exported from `lib/projectConstants.ts`; local copies removed from `MyTasksPage`, `ProjectFullPage`
4. ~~Extract `useDropdown()` hook~~ — **DONE**: created at `hooks/useDropdown.ts`; used in `ProjectFullPage` for `actionsOpen`
5. ~~Fix `MyTasksPage` `onAssigneeChange` to use `assignee_ids` array~~ — **DONE**: now passes `assignee_ids: assigneeId ? [assigneeId] : []`

### Do next (medium value, some risk)
6. Add `firmId` to `AddTaskModal` / `TaskFormData` so parent pages don't resolve it ad-hoc ← deferred
7. Extract `useTaskSave` hook with sub-task deadline clamping ← deferred
8. Extract `useAddSubTaskState` hook for the 3-state parent-task pattern ← deferred
9. Migrate `TaskDetailPanel` assignee section to use `InlineAssigneePicker` ← deferred
10. ~~Fix `actionsOpen` dropdown in `ProjectFullPage` to use `useDropdown()`~~ — **DONE** (covered in item 4)

### Decide / clean up
11. ~~Stub tabs in `ActivityPanel`~~ — **DONE**: "Files & Links" tab built (loads `projectAttachmentsApi`); "Notes" tab removed (no notes system in DB)
12. ~~`const [search] = useState('')` in `ProjectsSummaryPage`~~ — **DONE**: changed to `const search = ''` (no search UI exists yet)
13. Calendar components — adopt for deadline fields or remove from bundle ← deferred (decision needed)
14. ~~`useStartProjectTimer` sentinel `taskId: ''`~~ — **DONE**: `taskId?` and `taskTitle?` made optional in `TimerState`
15. ~~`AddTaskModal` project dropdown empty in `MyTasksPage`~~ — **DONE**: `useProjects()` called, filtered by `addTaskFirmId`, passed as `projects` prop
16. ~~`SubTaskRow` double-click not firing for row clicks outside title~~ — **DONE**: outer div uses `onClick={() => handleTitleClick()}`
