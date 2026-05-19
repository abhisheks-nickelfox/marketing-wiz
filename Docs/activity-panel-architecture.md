# Activity Panel — Architecture Plan

## Problem

The "Recent / Files & Links / Notes" panel appears in three places:

| Location | Component | Context |
|---|---|---|
| Task full page (right column) | `TaskActivityPanel.tsx` | aside, h-full |
| Task / sub-task slide-over | `TaskActivitySection` inside `TaskDetailPanel.tsx` | div, 420px fixed |
| Project full page (right column) | `ActivityPanel` inside `ProjectFullPage.tsx` | aside, h-full |

All three have the same tabs, the same file upload/delete UI, the same notes display, and the same helper functions — copy-pasted. Any UI change must be made in three places. Query keys are inconsistent. Minor visual details already diverge (icon sizes, padding, missing task footer on notes in slide-over).

---

## Target Architecture

One shared component `<ActivityPanel>` replaces all three. It accepts props that describe the context (scope, IDs, layout variant) and drives everything from there. No logic is duplicated.

### New file structure

```
frontend-new/src/components/activity/
  ActivityPanel.tsx        ← single export, composes all sub-components
  ActivityTabBar.tsx       ← bordered pill tab bar (the shared 3-tab control)
  ActivityFilesTab.tsx     ← project-scoped files list + upload + delete confirm
  ActivityNotesTab.tsx     ← timer entry descriptions (project or task scope)
  index.ts                 ← re-exports ActivityPanel as default
```

These files **replace**:
- `components/tasks/TaskActivityPanel.tsx` (deleted)
- `ActivityPanel` function inside `ProjectFullPage.tsx` (extracted out)
- `TaskActivitySection` function inside `TaskDetailPanel.tsx` (extracted out)

---

## Component Interface

```tsx
// components/activity/ActivityPanel.tsx

export interface ActivityPanelProps {
  // ── Scope ────────────────────────────────────────────────────────────────
  // Drives chat (Recent tab) and Notes tab API selection.
  scope:     'project' | 'task';
  scopeId:   string;   // projectId when scope='project', taskId when scope='task'

  // ── Files ─────────────────────────────────────────────────────────────────
  // All attachments are project-scoped. Always pass the task's project_id.
  // Pass null when the task has no project yet — Files tab shows a placeholder.
  projectId: string | null;

  // ── Layout ────────────────────────────────────────────────────────────────
  // 'aside'  → <aside> wrapper, h-full, 380px, white bg, isolate (full-page context)
  // 'inline' → <div> wrapper, fixed height (default 420px), no header (slide-over context)
  variant:  'aside' | 'inline';
  height?:  number;   // only applies when variant='inline'. Default: 420

  // ── Header (aside variant only) ───────────────────────────────────────────
  // Rendered above the tab bar. Always pass title="Activity".
  // onClose is optional — project panel has a close button, task panel does not.
  title?:   string;
  onClose?: () => void;
}
```

### Variant behaviour

| Prop | `variant='aside'` | `variant='inline'` |
|---|---|---|
| Wrapper | `<aside>` | `<div>` |
| Height | `h-full` | `style={{ height }}` (default 420px) |
| Width | `w-[380px] shrink-0` | `w-full` (fills slide-over) |
| Border | `border-l border-[#E9EAEB]` | none (slide-over provides its own border) |
| Header | rendered if `title` is set | never rendered |
| Close button | rendered if `onClose` is set | never rendered |

---

## Sub-component Interfaces

### ActivityTabBar

```tsx
// ActivityTabBar.tsx
interface ActivityTabBarProps {
  activeId:  'recent' | 'files' | 'notes';
  onChange:  (id: 'recent' | 'files' | 'notes') => void;
}
```

Renders the bordered pill/segment control. Shared by both variants.

---

### ActivityFilesTab

```tsx
// ActivityFilesTab.tsx
interface ActivityFilesTabProps {
  projectId: string | null;
  // Reads from / writes to queryKeys.projectAttachments.byProject(projectId)
  // Uses projectAttachmentsApi.list / upload / delete
}
```

- If `projectId` is null → shows `<EmptyState title="No project" description="Attach this task to a project to share files." />`
- Upload button always visible at top
- Each row: file icon, filename (link to `att.file_url`), size + uploader + relative date, trash icon on hover
- Trash click → inline red confirmation row (Cancel / Delete) — no modal needed
- Icon size: 18×18, container: w-9 h-9 (do not vary by context)
- Padding: `px-5` (matches project panel standard)

---

### ActivityNotesTab

```tsx
// ActivityNotesTab.tsx
interface ActivityNotesTabProps {
  scope:   'project' | 'task';
  scopeId: string;
}
```

**Data fetching by scope:**

| scope | API call | Response shape | Entries to collect |
|---|---|---|---|
| `'project'` | `projectTimeEntriesApi.list(scopeId)` | `ProjectDirectTimeEntrySummary` | `project_entries` + `task_summary[*].entries` + `task_summary[*].subtasks[*].entries` |
| `'task'` | `timeEntriesApi.list(scopeId)` | `TaskTimeEntrySummary` | `own_entries` + `subtask_summary[*].entries` |

After collecting, filter to entries where `description != null && description.trim() !== ''`, sort descending by `created_at`.

**Each note row:** avatar initial (purple circle), name, relative date (right-aligned), description text, optional `on: {entry.task.title}` footer (shown when `entry.task` exists and scope is `'project'`).

---

## Query Key Additions

Two keys are missing from the factory. Add to `queryKeys.ts`:

```ts
// Add inside queryKeys:
timeEntries: {
  byTask:    (taskId:    string) => ['time-entries', taskId]    as const,
  byProject: (projectId: string) => ['project-time-entries', projectId] as const,
},
```

Also add a `timeEntries` entry to `queryKeys.ts`. All consumers (hooks + components) must use these factory functions — no more raw string arrays for time entry keys.

---

## Shared Utilities

Add to `src/lib/formatUtils.ts` (new file):

```ts
export function formatFileSize(bytes: number): string { ... }
export function formatRelativeDate(iso: string): string { ... }
```

Both are currently copy-pasted in all three activity panel files and in `ProjectFullPage.tsx`. Move them here and import from one place. `formatRelativeDate` already exists in some form in `timeUtils.ts` — consolidate there or in `formatUtils.ts`, pick one.

---

## Callers After Refactor

### TaskDetailPage.tsx (task full page)

```tsx
// Before:
<TaskActivityPanel taskId={taskId!} projectId={task?.project_id ?? null} />

// After:
import ActivityPanel from '../../components/activity';
<ActivityPanel
  variant="aside"
  scope="task"
  scopeId={taskId!}
  projectId={task?.project_id ?? null}
  title="Activity"
/>
```

### ProjectFullPage.tsx (project full page)

```tsx
// Before (inline ActivityPanel function):
<ActivityPanel projectId={projectId} onClose={...} />

// After (imported shared component):
import ActivityPanel from '../../components/activity';
<ActivityPanel
  variant="aside"
  scope="project"
  scopeId={projectId}
  projectId={projectId}
  title="Activity"
  onClose={closeActivityPanel}
/>
```

The inline `ActivityPanel` function, `formatFileSize`, `formatRelativeDate`, and the `TABS` constant in `ProjectFullPage.tsx` are all deleted.

### TaskDetailPanel.tsx (slide-over, task + sub-task)

```tsx
// Before (inline TaskActivitySection function):
<TaskActivitySection taskId={task.id} projectId={task.project_id ?? null} />

// After (imported shared component):
import ActivityPanel from '../../components/activity';
<ActivityPanel
  variant="inline"
  height={420}
  scope="task"
  scopeId={task.id}
  projectId={task.project_id ?? null}
/>
```

The inline `TaskActivitySection` function, `formatFileSize`, `formatRelativeDate`, and `ACTIVITY_TABS` in `TaskDetailPanel.tsx` are all deleted.

---

## What Gets Deleted

| File | What is removed |
|---|---|
| `components/tasks/TaskActivityPanel.tsx` | Entire file replaced by `components/activity/` |
| `pages/projects/ProjectFullPage.tsx` | `ActivityPanel` function, `formatFileSize`, `formatRelativeDate`, `TABS` const, `type ActivityTab` |
| `components/tasks/TaskDetailPanel.tsx` | `TaskActivitySection` function, `formatFileSize`, `formatRelativeDate`, `ACTIVITY_TABS` const, `type ActivityTab` |

---

## Visual Spec (canonical — everything should match this)

```
┌─────────────────────────────────────────┐  ← white bg
│  Activity                          [✕]  │  ← header (aside only, onClose optional)
├─────────────────────────────────────────┤
│  ┌──────────┬──────────┬──────────┐     │  ← px-4/5, pb-3
│  │  Recent  │Files &..│  Notes   │     │  ← bordered pill, 12px semibold
│  └──────────┴──────────┴──────────┘     │
├─────────────────────────────────────────┤  ← 1px divider
│                                         │
│  [tab content — flex-1 overflow-y-auto] │
│                                         │
└─────────────────────────────────────────┘
```

Active tab: `text-[#181D27]` (near black), no active background change, bordered container provides visual grouping.
Inactive tab: `text-[#717680]`, hover `text-[#414651] bg-[#F9FAFB]`.

---

## Known Inconsistencies to Fix During Migration

| # | Issue | Fix |
|---|---|---|
| 1 | `ProjectFullPage` uses hardcoded `['project-attachments', projectId]` key | Use `queryKeys.projectAttachments.byProject(projectId)` |
| 2 | Time entry query keys are raw strings, not factory functions | Add factory to `queryKeys.ts`, migrate all consumers |
| 3 | `TaskDetailPanel` notes row missing `entry.task.title` footer | Add in shared `ActivityNotesTab` |
| 4 | Icon size differs: TaskDetailPanel uses 16×16 / w-8, others use 18×18 / w-9 | Standardise to 18×18 / w-9 |
| 5 | Padding differs: project panel uses px-5, task panels use px-4 | Standardise to px-5 |

---

## Implementation Order

1. **Add query key factories** to `queryKeys.ts` (timeEntries.byTask, timeEntries.byProject)
2. **Create `src/lib/formatUtils.ts`** with `formatFileSize` and `formatRelativeDate`
3. **Create `ActivityTabBar.tsx`** — extract the pill tab bar
4. **Create `ActivityFilesTab.tsx`** — extract files tab (use `queryKeys`, use `file_url`, px-5)
5. **Create `ActivityNotesTab.tsx`** — extract notes tab with scope-aware data fetching
6. **Create `ActivityPanel.tsx`** — assemble sub-components, handle variant/header/layout
7. **Create `index.ts`** — `export { default } from './ActivityPanel'`
8. **Update `TaskDetailPage.tsx`** — swap `TaskActivityPanel` for `ActivityPanel`
9. **Update `ProjectFullPage.tsx`** — delete inline function, use `ActivityPanel`, fix query key
10. **Update `TaskDetailPanel.tsx`** — delete inline `TaskActivitySection`, use `ActivityPanel`
11. **Delete `TaskActivityPanel.tsx`**
12. **Build + verify** — `npm run build` must produce zero TypeScript errors

---

## Acceptance Criteria

- [ ] `npm run build` produces zero TypeScript errors
- [ ] All three contexts (project full page, task full page, task/subtask slide-over) render identically except for layout variant
- [ ] Uploading a file from any context updates the file list in all three immediately (shared query key)
- [ ] Notes tab shows timer descriptions for the correct scope in each context
- [ ] No instance of `formatFileSize` or `formatRelativeDate` exists outside `formatUtils.ts`
- [ ] No raw string array query keys for attachments or time entries anywhere
- [ ] `TaskActivityPanel.tsx` is deleted
