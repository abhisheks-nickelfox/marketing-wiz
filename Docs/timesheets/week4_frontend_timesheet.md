# Frontend Timesheet — Week 4
**Sprint:** Project Management & Task Workflows
**Period:** May 4–8, 2026
**Developer:** Frontend Developer
**Allocation:** 8 hrs/day · Total: 40 hrs

---

## Monday, May 4, 2026

| # | Task | Files | Details | Duration |
|---|------|-------|---------|----------|
| 1 | Reusable UI components setup | `components/ui/EmptyState.tsx`, `LoadingSpinner.tsx`, `PageShell.tsx`, `SectionDivider.tsx`, `Select.tsx`, `SettingsRow.tsx` | Built 6 reusable base components. `EmptyState` accepts icon, title, description, action button props. `LoadingSpinner` with size variants (sm/md/lg). `PageShell` wraps page with consistent padding + header slot. `SectionDivider` for content separation. `Select` styled dropdown. `SettingsRow` for key-value settings layout | 1h 30m |
| 2 | DropdownMenu component | `components/ui/DropdownMenu.tsx` | Generic portal-rendered dropdown menu (49 lines). Accepts `items[]` with label, icon, onClick, variant (default/danger). Auto-closes on item click or outside click. Used across all context menus in project/task rows | 45m |
| 3 | Axios network layer | `lib/network/axiosInstance.ts`, `lib/network/interceptors.ts` | Created axios instance with 10s timeout and base URL from `VITE_API_URL`. Request interceptor attaches `Authorization: Bearer <mw_token>` from localStorage/sessionStorage. Response interceptor redirects to `/login` on 401 | 1h 00m |
| 4 | Yup validation schemas | `lib/validation/auth.schemas.ts`, `lib/validation/user.schemas.ts` | Auth schemas: login (email + min 6 char password), forgot-password, reset-password (password + confirm match). User schemas: createUser (name, email, role, optional phone E.164), updateUser (all optional) | 45m |
| 5 | Sidebar navigation update | `components/Sidebar.tsx`, `components/sidebar/ExpandableNavItem.tsx` | Added new nav items: Projects, Time Reports, Team Pulse, My Tasks, My Timesheet with SVG icons from `assets/navbar-icon/`. `ExpandableNavItem` handles collapsible sub-nav sections. Replaced PNG icons with proper SVG assets | 1h 00m |
| 6 | Asset organisation | `assets/navbar-icon/`, `assets/contact-icons/`, `assets/quick-links/` | Renamed icon files to consistent `icon-*.png/svg` naming convention. Added contact icons (calendar, mail, phone SVGs). Added quick-links icons (dropbox, hubspot, reports SVGs) | 30m |
| 7 | App routing update | `src/App.tsx` | Added routes for `AddFirmPage` (`/firms/new`), `EditFirmPage` (`/firms/:id/edit`), `ProjectsSummaryPage` (`/projects`), `MyTasksPage` (`/my-tasks`) | 30m |
| 8 | Frontend types cleanup | `src/types/index.ts` | Removed 9 redundant type definitions now covered by `lib/api.ts` interfaces | 30m |
| 9 | Task badges update | `components/tasks/TaskBadges.tsx`, `TaskCard.tsx` | Updated `TaskBadges` to support all 8 new task statuses with correct colour mapping. Updated `TaskCard` to consume new badge system | 30m |
| **Total** | | | | **7h 00m** |

---

## Tuesday, May 5, 2026

| # | Task | Files | Details | Duration |
|---|------|-------|---------|----------|
| 1 | FirmStepForms component | `components/firms/FirmStepForms.tsx` (458 lines) | Built multi-step firm creation form with 3 steps: (1) Basic info — name, description, website URL, location; (2) Contact details — contact name, email, role, phone with `PhoneInput` component; (3) Account settings — account manager picker, default prompt selector. Each step has its own validation. Step state managed via parent prop | 2h 00m |
| 2 | AddFirmPage | `pages/AddFirmPage.tsx` (159 lines) | Full page with breadcrumb (Firms › Add Firm), progress stepper (3 steps), `FirmStepForms` embedded, form submit calls `firmsApi.create`, success redirects to `/firms`. Error toast on failure | 1h 00m |
| 3 | EditFirmPage | `pages/EditFirmPage.tsx` (204 lines) | Pre-populates all firm fields from `firmsApi.get(id)`. Tabbed layout: Basic Info / Contact / Settings tabs. Save calls `firmsApi.update(id, payload)`. Delete firm button with `DeleteFirmModal` confirm. Logo upload via S3 using `profileApi.uploadAvatar` | 1h 30m |
| 4 | useFirms hook expansion | `hooks/useFirms.ts` | Added `useCreateProject`, `useUpdateProject`, `useDeleteProject` mutations. Added `useProjects(firmId?)` query. All project mutations invalidate `queryKeys.projects.all` and `queryKeys.projects.byFirm(firmId)`. Added `useFirmDetail(id)` for single firm with stats | 1h 00m |
| 5 | API client — firms + projects | `lib/api.ts` | Added `firmsApi.create`, `firmsApi.update`, `firmsApi.delete`. Added complete `projectsApi`: `list(firm_id?)`, `get(id)`, `overview(id)`, `create(payload)`, `update(id, payload)`, `toggleArchive(id)`, `delete(id)`, `listMembers(id)`, `addMember(id, userId)`, `removeMember(id, userId)`, `generateShareLink(id)`, `getSharedProject(token)`. Added `CreateProjectPayload` and `UpdateProjectPayload` interfaces | 1h 30m |
| 6 | useTaskTypes hook | `hooks/useTaskTypes.ts` (37 lines) | `useTaskTypes()` — queries `GET /task-types`, stale time 5min. `useCreateTaskType()` — POST mutation with cache invalidation. `useDeleteTaskType()` — DELETE mutation. All keyed under `queryKeys.taskTypes.all` | 30m |
| 7 | useOrgSettings hook | `hooks/useOrgSettings.ts` (18 lines) | `useOrgSettings()` fetches `GET /org-settings`. `useUpdateOrgSettings()` PATCH mutation with optimistic cache update | 30m |
| **Total** | | | | **8h 00m** |

---

## Wednesday, May 6, 2026

| # | Task | Files | Details | Duration |
|---|------|-------|---------|----------|
| 1 | TaskRow component | `components/firms/TaskRow.tsx` (390 lines) | Built reusable `TaskRow` — the standard row used in all project status sections. Left side: `>` chevron (expand sub-tasks), status ring SVG (colored by status), folder icon, task title truncated. Right side: `AvatarStack` (max 3) for assignees, dashed `+` add-assignee button (visible on hover), due date with `formatDeadline` helper (returns "Today"/"Tomorrow"/date + overdue flag), priority badge. Exported shared column-width constants `COL_ASSIGNEE`, `COL_DATE`, `COL_PRIORITY`, `COL_STATUS`, `COL_MENU` and `PRIORITY_BADGE`, `formatDeadline` used across `ProjectRow`, `ProjectGroupRow`, `ProjectsSummaryPage` | 2h 00m |
| 2 | ProjectGroupRow component | `components/firms/ProjectGroupRow.tsx` (458 lines) | Built `ProjectGroupRow` — collapsible row showing one project and its tasks. Header: status dot SVG, folder icon, project name (opens detail panel), archived badge, firm badge, task count, `AvatarStack` with member picker. Member picker uses `calcPickerPos(rect)` to position dropdown within viewport. Context menu (⋮): Edit, Open Project, Delete. Expanded body: column header row (Project / Assignee / Due date / Priority / Status / Menu), then `StatusSection` grouping tasks. `StatusSection` groups `Task[]` by `project_id`, shows project sub-header, then one `TaskRow` per task | 2h 30m |
| 3 | TaskFilterPanel component | `components/firms/TaskFilterPanel.tsx` (267 lines) | Slide-in filter panel for task list within FirmDetailPage. Filters: Status multi-select (all 8 statuses as pill badges), Assignee multi-select (with avatar), Priority checkboxes, Date range (start/end). Apply / Clear / Cancel footer. Syncs with URL params | 1h 00m |
| 4 | AttachmentsSection component | `components/tasks/AttachmentsSection.tsx` (254 lines) | Reusable file attachment component. Drag-and-drop zone or click-to-browse (`FileUpload` wrapper). Accepted types: PDF, DOCX, XLSX, PNG, JPG, MP4 (max 20MB). File card shows: type icon (PDF→red, MP4→blue, DOCX→indigo, image→purple, generic→gray), file name, formatted size (bytes→KB→MB). Delete button with inline confirm. Calls `projectsApi.listAttachments(projectId)`, `uploadAttachment(projectId, file)`, `deleteAttachment(projectId, attId)` | 2h 00m |
| 5 | API client — attachments + tasks | `lib/api.ts` | Added `projectsApi.listAttachments(id)`, `uploadAttachment(id, file)`, `deleteAttachment(id, attId)`. Added `project_id?`, `assignee_id?`, `overdue?` to `tasksApi.list` params. Added `tasksApi.resolve(id)`, `tasksApi.create(payload)`, `tasksApi.delete(id)` | 30m |
| **Total** | | | | **8h 00m** |

---

## Thursday, May 7, 2026

| # | Task | Files | Details | Duration |
|---|------|-------|---------|----------|
| 1 | FirmDetailPage full build | `pages/FirmDetailPage.tsx` (199 lines) | Built firm detail page with 6 tabs: Overview, Client Requests, Projects, Time Reports, Notes, Firm Details. Tab state in URL param. Header: firm name, logo avatar, status badge, edit button. Each tab lazy-rendered. `ProjectsTab` is the primary tab | 1h 00m |
| 2 | ProjectsTab — full implementation | `components/firms/ProjectsTab.tsx` (933 lines) | Core project management view within FirmDetailPage. **Status sections**: 8 `StatusGroup` definitions (`todo`→`to_do`, `inprogress`→`in_progress`, etc.). Tasks fetched via `useTasks({ firm_id })`, grouped into sections by `TASK_STATUS_TO_GROUP` map. Projects fetched via `useProjects(firmId)`, placed in sections by task status OR `workflow_status` if no tasks. **Task CRUD**: `handleCreateTask` calls `createTask.mutateAsync` with `GROUP_ID_TO_STATUS` normalisation fix. `handleUpdateTask` for status/assignee/deadline changes. **Project CRUD**: `handleCreateProject`, `handleSaveProject` (update name/description/status/members/dates). `openAddTask(projectId, status)` opens `AddTaskModal` with pre-filled context. **Move task**: drag task between status sections calls `updateTask({ project_id })` | 2h 30m |
| 3 | AddTaskModal | `components/firms/AddTaskModal.tsx` (502 lines) | Formik + Yup form in a centred modal. **Fields**: Task Type (dropdown from `useTaskTypes` with color dots), Task Name (required), Description (textarea), Project (dropdown filtered to firm), Start date, End date (capped to project `end_date`), Assignee (avatar multi-select from users list), Priority (Urgent/High/Medium/Low with colored dots), File upload zone. **Sub-task mode**: when `parentTaskId` prop set — title changes to "Add Sub-task", end date capped to `parentTaskDeadline`, sub-task label shown. `handleSubmit` emits full `TaskFormData` | 2h 00m |
| 4 | DeleteProjectModal | `components/firms/DeleteProjectModal.tsx` | Confirmation modal that lists tasks belonging to the project. Checkbox: "Also delete N tasks". On confirm calls `deleteProject.mutateAsync({ id, taskIds? })`. Disabled state while `isPending` | 30m |
| 5 | AddSkillsModal | `components/users/AddSkillsModal.tsx` (184 lines) | Modal for bulk-adding skills to a user. Search box filters skill catalog. Selected skills shown as removable chips. Experience level picker per skill (Beginner/Intermediate/Advanced/Expert). Save calls `usersApi.update(id, { skill_ids })` | 1h 00m |
| 6 | EditUserDrawer update | `components/users/EditUserDrawer.tsx` (159 lines updated) | Added skills section to edit drawer. `AddSkillsModal` trigger button. Skill badges with remove (×) button. Member role picker (dropdown from `useMemberRoles`). Avatar upload with `ImageCropModal` | 1h 00m |
| **Total** | | | | **8h 00m** |

---

## Friday, May 8, 2026

| # | Task | Files | Details | Duration |
|---|------|-------|---------|----------|
| 1 | ProjectsSummaryPage | `pages/ProjectsSummaryPage.tsx` (999 lines) | Global projects view across all firms. **By-Status mode**: 8 collapsible `ProjectStatusSection` groups. `projectGroupsFromTasks` useMemo: maps each project into all status sections where it has tasks. `projectTaskCounts` useMemo: per-project per-group task counts. Projects with no tasks appear once based on `workflow_status`. **By-Firm mode**: left sidebar listing firms with project counts; click firm filters project list. **Header**: search bar (filters by name/firm), By Status / By Firm toggle, Add Project button, Filter button with active count badge. **`ProjectRow`**: status dot SVG, folder icon, project name (→ opens `ProjectSummaryPanel`), archived badge, firm badge, task count, `AvatarStack`, due date, priority badge, status badge, context menu (Edit / Open Project / Delete). **`ProjectStatusSection`**: collapsible with chevron, count badge, column header row, list of `ProjectRow`. `openAddProject(groupId)` → if By-Firm use current firm, else open `FirmPickerModal` → `AddProjectModal`. `onClear` resets both pending and applied filter state | 2h 30m |
| 2 | ProjectSummaryPanel | `components/firms/ProjectSummaryPanel.tsx` (536 lines) | Figma-exact view panel (`max-w-[700px]` slide-over). **Header**: 40×40 purple folder icon, project name + firm name, created date, Actions dropdown (Edit Project / Copy Link / Archive / Delete), X close. **4-column metadata row**: Assignee (`AvatarStack` + dashed + button), Status (colored pill badge with `→` dropdown — options with dot), Priority (styled badge), Due date ("Today"/"Tomorrow"/date, red if overdue). **2-column metadata row**: Task Type (badges from `taskTypes` derived from project tasks), Timesheet (first member avatar + `fmtHours` + Clock icon). **Description**: pre-wrap text or italic placeholder. **Attachments**: `AttachmentsSection`. **Custom Fields**: "Service type" label + pill badges from task types. **Tasks**: filters `allProjectTasks` to `!parent_task_id` (top-level only). Each task row: `>` chevron, status ring SVG (colored by `TASK_STATUS_DOT`), folder icon, title, status badge (`TASK_STATUS_BADGE` colored), `AvatarStack`, dashed + button (hover), due date, priority badge. `TASK_STATUS_BADGE` map covers all 12 statuses with correct Tailwind classes | 2h 00m |
| 3 | ProjectDetailPanel | `components/firms/ProjectDetailPanel.tsx` (421 lines) | Always-editable SlideOver (`max-w-[480px]`). **Fields**: Project name `Input`, Description `textarea`, Status dropdown (6 options with colored dot SVGs), Priority dropdown (High/Medium/Low), Start date + End date grid, Assignees section (member chips with × remove + dashed add button + member picker dropdown with search). **Tasks list**: `useTasks({ project_id })`, filters `!parent_task_id`, shows status badge per task. **`AttachmentsSection`**. **Footer**: Save button (left) | Cancel + View Project buttons (right). `handleSave` calls `onSave(updated)` prop | 1h 30m |
| 4 | ProjectFilterPanel | Part of `ProjectsSummaryPage.tsx` | Figma-exact filter panel (`w-[360px]`). 12 status options: each has a custom div checkbox (purple fill + white SVG checkmark when checked), and a colored pill badge (e.g. "Overdue" → orange, "Blocked" → red, "Complete" → green). Firms section: search input with ⌘K badge, list with checkboxes, "Show N more" pagination. Footer: "Clear filter" text link (resets all + closes) | Cancel button | "Apply filter" purple button. `onClear` prop resets `pendingStatuses`, `pendingFirmIds`, `filterStatuses`, `filterFirmIds`, closes panel | 1h 00m |
| 5 | useTasks hook update | `hooks/useTasks.ts` (95 lines) | Added `project_id?` param to `useTasks` query and query key. Added `useResolveTask`, `useAssignApproveTask` mutations. Fixed `useDiscardTask` to invalidate correct cache keys | 20m |
| 6 | API client fixes | `lib/api.ts` | Added `project_id` to `tasksApi.list` query string builder. Added `status?: 'active' \| 'archived'` to `UpdateProjectPayload` interface. Fixed TypeScript strict errors across `projectsApi` return types | 20m |
| 7 | Docker build fix | `pages/ProjectsSummaryPage.tsx` | Removed unused `User` import (TS error TS6196). Added `status` field to `UpdateProjectPayload` (TS error TS2353). Both fixes confirmed clean with `npx tsc --noEmit` | 20m |
| **Total** | | | | **8h 00m** |

---

## Weekly Summary

| Day | Date | Primary Focus | Hours |
|-----|------|--------------|-------|
| Monday | May 4 | Reusable UI components, navigation, routing, axios layer, Yup validation | 8h |
| Tuesday | May 5 | FirmStepForms, AddFirmPage, EditFirmPage, useFirms hook, API client | 8h |
| Wednesday | May 6 | TaskRow, ProjectGroupRow, TaskFilterPanel, AttachmentsSection | 8h |
| Thursday | May 7 | FirmDetailPage, ProjectsTab, AddTaskModal, DeleteProjectModal, AddSkillsModal | 8h |
| Friday | May 8 | ProjectsSummaryPage, ProjectSummaryPanel, ProjectDetailPanel, FilterPanel, bug fixes | 8h |
| **Total** | | | **40h** |

### Breakdown by Category

| Category | Key Files | Hours |
|----------|-----------|-------|
| Pages | FirmDetailPage, ProjectsSummaryPage, AddFirmPage, EditFirmPage | 7h 30m |
| Panels & Modals | ProjectSummaryPanel, ProjectDetailPanel, AddTaskModal, TaskDetailPanel, AddSkillsModal | 8h 30m |
| Components | ProjectGroupRow, TaskRow, AttachmentsSection, TaskFilterPanel, ProjectFilterPanel, DropdownMenu | 7h 30m |
| UI Components | EmptyState, LoadingSpinner, PageShell, SectionDivider, Select, SettingsRow | 1h 30m |
| Hooks | useFirms, useTasks, useTaskTypes, useOrgSettings | 2h 30m |
| API Client & Types | api.ts, types/index.ts, constants.ts | 2h 30m |
| Network Layer & Validation | axiosInstance, interceptors, auth.schemas, user.schemas | 1h 45m |
| Assets & Navigation | Sidebar, icons, App.tsx routing | 1h 45m |
| Bug Fixes & Build | GROUP_ID_TO_STATUS, Docker TS errors, parent_task_id filter | 1h 00m |
| Testing / QA | tsc --noEmit checks, manual smoke tests | 45m |
| **Total** | | **40h** |

---

*Generated: 2026-05-11 | Sprint: Week 4 | Project: AI Wealth Connections*
