# Backend Timesheet — Week 4
**Sprint:** Project Management & Task Workflows
**Period:** May 4–8, 2026
**Developer:** Backend Developer
**Allocation:** 8 hrs/day · Total: 40 hrs

---

## Monday, May 4, 2026

| # | Task | Files | Details | Duration |
|---|------|-------|---------|----------|
| 1 | Task status system redesign | `migrations/030_new_task_status_system.sql` (283 lines) | Replaced legacy 10-value status set with 8-value project-oriented workflow. New statuses: `to_do`, `assigned`, `in_progress`, `revisions`, `internal_review`, `client_review`, `completed`, `blocked`. Data migration map: `draft→to_do`, `in_progress→in_progress`, `resolved→completed`, `internal_review→internal_review`, `client_review→client_review`, `compliance_review→internal_review`, `approved(with assignee_id)→assigned`, `approved(no assignee_id)→in_progress`, `closed→completed`. Dropped old CHECK constraint, added new one, backfilled all existing rows with `UPDATE WHERE status =` per mapping | 1h 30m |
| 2 | Project manager role | `migrations/031_add_project_manager_role.sql` | Added `project_manager` to `users.role` CHECK constraint. Updated RLS helper function `current_user_role()` to treat `project_manager` same as `admin` for read policies. Added migration note about `super_admin` being retired | 30m |
| 3 | Sequelize model layer | `models/Ticket.ts`, `Project.ts`, `User.ts`, `TimeLog.ts`, `Skill.ts`, `UserSkill.ts`, `OrgSettings.ts`, `ProjectMember.ts`, `Notification.ts`, `Transcript.ts`, `Prompt.ts`, `ProcessingSession.ts`, `models/index.ts` | Built complete Sequelize model definitions for all 12 domain entities. Each model: TypeScript interface, column definitions with correct types (UUID, TEXT, NUMERIC, TIMESTAMPTZ), nullable flags, defaultValues, associations (hasMany/belongsTo/belongsToMany). `models/index.ts` initialises Sequelize connection and exports all models. Sequelize replaces direct Supabase client queries in task/project modules | 2h 00m |
| 4 | Tasks service — core CRUD | `modules/tasks/tasks.service.ts` (689 lines, partial) | Implemented foundation functions: `createTask(dto)` — inserts ticket row, syncs `task_assignees` via `syncTaskAssignees`, optionally syncs assignees into `project_members`, sets `initial_status` (default `to_do`). `findTaskById(id)` — joins `users` for assignee, `firms` for firm name, `projects` for project name, `task_types` for type name. `findAllTasks(options)` — full filter support: `firm_id`, `project_id`, `assignee_id`, `status`, `type`, `priority`, `archived`, `overdue` (deadline < NOW()), `session_id`. Builds Sequelize `where` clause dynamically | 2h 30m |
| 5 | Backend config & constants | `config/constants.ts` | Added `VALID_TASK_STATUSES` array for new 8-value set. Added `STATUS_PRIORITY` map for sort ordering. Added `VALID_WORKFLOW_STATUSES` for projects. Removed legacy `VALID_TRANSITIONS` (replaced by simpler direct-update model) | 30m |
| 6 | TypeScript types update | `src/types/index.ts` | Updated `TaskStatus` union to 8 new values. Added `WorkflowStatus` type for projects. Added `CreateTaskDto`, `UpdateTaskDto`, `AssignApproveDto` interfaces. Added `ProjectRow`, `ProjectWithStats`, `ProjectOverview`, `TaskSummary` interfaces | 1h 00m |
| **Total** | | | | **8h 00m** |

---

## Tuesday, May 5, 2026

| # | Task | Files | Details | Duration |
|---|------|-------|---------|----------|
| 1 | Tasks service — advanced operations | `modules/tasks/tasks.service.ts` (remainder) | Completed service: `updateTask(id, updates)` — validates field updates, handles `project_id` change (updates sub-tasks via `UPDATE tickets SET project_id WHERE parent_task_id`), syncs assignees. `assignAndApproveTask(id, dto)` — sets `assignee_id`, transitions status to `assigned`. `discardTask(id)` — soft status change to `discarded`. `deleteTask(id)` — hard delete (only discarded tickets). `archiveTask(id, archived)`. `transitionTask(options)` — validates allowed transitions, inserts `transition` log to `time_logs`. `resolveTask(options)` — validates ownership + status, transitions to `completed`, inserts `final` time log. Private helpers: `syncTaskAssignees(taskId, assigneeIds)`, `fetchTaskAssignees(taskId)`, `syncAssigneesToProjectMembers(projectId, assigneeIds)`, `assigneeCondition(userId)` for RBAC scoping, `getProjectMemberIds(projectId)` | 2h 00m |
| 2 | Tasks controller | `modules/tasks/tasks.controller.ts` (424 lines) | Implemented all 13 controller handlers: `createTask`, `listTasks`, `getTask`, `listSubTasks`, `updateTask`, `assignAndApprove`, `discardTask`, `regenerateTaskContent` (calls `ai.service` with transcript), `resolveTask`, `deleteTask`, `archiveTask`, `transitionTask`. Each handler: parses `req.body`/`req.params`, calls service, catches errors, returns `{ data }` or `{ error }`. Attachment sub-resource handlers: `listAttachments`, `uploadAttachment`, `deleteAttachment` | 1h 30m |
| 3 | Tasks routes | `modules/tasks/tasks.routes.ts` | Registered 13 task routes + 3 attachment + 4 time-log sub-routes. All behind `authenticate`. Admin-only: `POST /`, assign-approve, discard, regenerate, delete, archive, transition. Member: get, list, update, resolve, time-logs. Validation middleware applied to all mutating routes | 30m |
| 4 | Time logs service | `modules/tasks/time-logs.service.ts` (132 lines) + `time-logs.controller.ts` (30 lines) | `listTimeLogs(ticketId)` — returns all logs ordered by `created_at` with `user.name`. `createTimeLog(dto)` — validates ticket status is `in_progress` or `revisions`, inserts log with `log_type`, `revision_cycle` from `tickets.revision_count`. `updateTimeLog(ticketId, logId, userId, updates)` — ownership check (`user_id = userId` unless admin), validates `hours` range 0.01–999.99. `deleteTimeLog(ticketId, logId, userId)` — ownership check, hard delete. `time-logs.validation.ts` — express-validator chains for create/update/delete | 1h 30m |
| 5 | AWS S3 storage layer | `config/storage.ts` (126 lines) | `isS3Configured()` — returns true when `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET` all present. `getS3Client()` — lazy singleton `S3Client` with credentials from env. `uploadToS3(key, body, contentType)` — `PutObjectCommand`, returns `https://<bucket>.s3.<region>.amazonaws.com/<key>`. `uploadBase64Image(key, dataUrl)` — strips data URL prefix, decodes base64 to `Buffer`, calls `uploadToS3`. `uploadFileBuffer(key, buffer, contentType)` — direct buffer upload. `deleteFromS3(key)` — `DeleteObjectCommand`. All functions fall back gracefully (log warning + return data URL) when S3 not configured | 1h 30m |
| 6 | Backend env & package | `.env.example`, `package.json` | Added `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET` to `.env.example`. Added `@aws-sdk/client-s3` dependency. Added `sequelize`, `sequelize-typescript`, `pg`, `pg-hstore` dependencies | 30m |
| 7 | Database config | `config/database.ts` | Initialised Sequelize with PostgreSQL dialect using `DATABASE_URL` from env. Connection pool: max 10, min 2, acquire 30s timeout. Logging disabled in production (`NODE_ENV=production`) | 30m |
| **Total** | | | | **8h 00m** |

---

## Wednesday, May 6, 2026

| # | Task | Files | Details | Duration |
|---|------|-------|---------|----------|
| 1 | Projects schema additions | `migrations/033_projects_dates_priority_type.sql` | Added columns to `projects`: `start_date DATE` nullable, `end_date DATE` nullable, `priority TEXT NOT NULL DEFAULT 'medium' CHECK IN ('high','medium','low')`, `type TEXT` nullable (free-form, no CHECK — vocabulary to evolve). Added `projects_dates_ordered` CHECK constraint: `end_date >= start_date` enforced only when both non-null. Added `idx_projects_end_date` and `idx_projects_priority` indexes for deadline/priority queries | 45m |
| 2 | Task types catalog | `migrations/035_task_types_table.sql` (110 lines) | Created `task_types` table: `id UUID PK`, `name TEXT UNIQUE NOT NULL`, `description TEXT`, `color TEXT` (hex colour for UI). Seeded 4 default types: Design (#3538CD blue), Development (#5925DC purple), Account Management (#C01048 pink), Content (#027A48 green). Added `tickets.task_type_id UUID FK→task_types(id) ON DELETE SET NULL` alongside legacy `tickets.type` TEXT for backward compat. Added `idx_tickets_task_type_id` | 1h 00m |
| 3 | Task type members junction | `migrations/042_task_type_members.sql` | Created `task_type_members`: `task_type_id FK→task_types ON DELETE CASCADE`, `user_id FK→users ON DELETE CASCADE`, `PK(task_type_id, user_id)`, `added_at TIMESTAMPTZ`. `idx_task_type_members_user_id` for user-centric queries. RLS: authenticated users read; admin write | 30m |
| 4 | Task types module | `modules/task-types/dto/create-task-type.dto.ts`, `update-task-type.dto.ts`, service, controller, routes | Built complete task-types CRUD module. Service: `listTaskTypes()`, `createTaskType(dto)` validates name unique, `updateTaskType(id, dto)`, `deleteTaskType(id)` blocks delete if tasks reference it, `addMemberToTaskType(taskTypeId, userId)`, `removeMemberFromTaskType(taskTypeId, userId)`, `listTaskTypeMembers(taskTypeId)`. Routes: `GET /task-types`, `POST /task-types`, `PATCH /task-types/:id`, `DELETE /task-types/:id`, `GET /task-types/:id/members`, `POST /task-types/:id/members`, `DELETE /task-types/:id/members/:userId` | 2h 00m |
| 5 | Projects service — foundation | `modules/projects/projects.service.ts` (partial — 452 lines total) | Built initial project functions: `findAllProjects(firmId?)` — joins `project_members` + `users` for member avatars, computes `task_count` via subquery. `findProjectById(id)` — same joins. `createProject(dto)` — inserts project, optionally bulk-inserts `member_ids` into `project_members`, sets `workflow_status`. `updateProject(id, updates)` — handles `member_ids` diff: removes removed members, adds new members. Types: `WorkflowStatus`, `ProjectRow`, `ProjectMemberRow`, `ProjectWithStats` | 2h 00m |
| 6 | Auth config refactor | `config/auth.ts` | Extracted JWT verification logic into standalone module. `verifyToken(token)` calls Supabase anon client. `getUserProfile(userId)` fetches full `users` row. Used by `middleware/auth.ts` | 45m |
| **Total** | | | | **7h 00m** |

---

## Thursday, May 7, 2026

| # | Task | Files | Details | Duration |
|---|------|-------|---------|----------|
| 1 | Projects service — advanced | `modules/projects/projects.service.ts` (remainder) | Completed service: `getProjectOverview(id)` — fetches project + all tasks grouped by status into `TaskSummary[]`, returns `ProjectOverview` with `tasksByStatus` map. `addProjectMember(projectId, userId)` — upsert into `project_members`. `removeProjectMember(projectId, userId)` — delete from `project_members`. `listProjectMembers(projectId)` — returns `ProjectMemberRow[]` with user details. `toggleProjectArchive(id)` — flips `status` between `active`/`archived`. `getProjectTasks(id)` — returns lightweight `{id, title, status, priority, parent_task_id}` array. `generateShareToken(projectId)` — `gen_random_uuid()` stored in `projects.share_token`, returns token. `getPublicProjectView(shareToken)` — public read with firm + tasks + members. `deleteProject(id)` — blocks if tasks exist unless `force: true`, cascades member rows | 2h 00m |
| 2 | Projects controller & routes | `modules/projects/projects.controller.ts` (265 lines), `projects.routes.ts` | Controller: 14 handlers — `listProjects`, `getProject`, `getProjectOverview`, `getProjectTasks`, `generateShareLink`, `getSharedProject`, `createProject`, `updateProject`, `archiveProject`, `deleteProject`, `listMembers`, `addMember`, `removeMember`. Plus attachment controllers imported. Routes: full REST with auth guards + validation middleware on create/update. Attachment sub-routes: `GET|POST|DELETE /:id/attachments` | 1h 30m |
| 3 | Project attachments migration | `migrations/037_project_attachments.sql` | Created `project_attachments` table: `project_id FK ON DELETE CASCADE`, `file_url TEXT NOT NULL`, `file_name TEXT NOT NULL`, `file_size INTEGER CHECK(>0)`, `file_type TEXT` (MIME, no CHECK), `uploaded_by FK→users ON DELETE SET NULL`. Indexes: `idx_project_attachments_project_id(project_id, created_at DESC)`, `idx_project_attachments_uploaded_by`. RLS: member read/write own firm's projects | 45m |
| 4 | Project attachments controller | `modules/projects/project-attachments.controller.ts` | `listProjectAttachments(projectId)` — returns all attachments ordered `created_at DESC`. `uploadProjectAttachment(projectId, userId, file)` — uses `multer` in-memory storage, calls `uploadFileBuffer(key, buffer, mimetype)` with S3 key pattern `project-attachments/<projectId>/<uuid>_<originalname>`, inserts metadata row. `deleteProjectAttachment(projectId, attId, userId)` — fetches `file_url`, parses S3 key, calls `deleteFromS3`, deletes DB row | 1h 00m |
| 5 | Active timers migration | `migrations/038_active_timers.sql` | Created `active_timers`: `user_id UNIQUE FK→users ON DELETE CASCADE` (one timer per user), `ticket_id nullable FK→tickets ON DELETE CASCADE`, `started_at TIMESTAMPTZ NOT NULL`. No `updated_at` — row is immutable; only INSERT (start) and DELETE (stop). RLS: users read/write own row | 30m |
| 6 | Org settings module | `migrations/041_org_settings.sql`, `modules/org-settings/org-settings.service.ts`, controller, routes | Migration: `org_settings(id, logo_url, created_at, updated_at)`, seeded one default row, `trg_org_settings_updated_at` trigger. Service: `getSettings()` — returns single row. `updateSettings(dto)` — PATCH logo_url. `uploadLogo(file)` — calls `uploadFileBuffer` with S3 key `org/logo/<uuid>_<filename>`. Routes: `GET /org-settings`, `PATCH /org-settings`, `POST /org-settings/logo` | 1h 00m |
| 7 | Skills module fixes | `modules/skills/skills.service.ts`, `skills.validation.ts`, `APPLY_THIS_skills_fix.sql`, `040_skills_update_policy.sql` | Fixed RLS policy on `skills` table that was blocking authenticated inserts. Added UPDATE policy. Fixed `skills.service.ts` to use Sequelize instead of direct Supabase client. Added `skills.description TEXT`, `skills.color TEXT` via migration 034 | 1h 15m |
| **Total** | | | | **8h 00m** |

---

## Friday, May 8, 2026

| # | Task | Files | Details | Duration |
|---|------|-------|---------|----------|
| 1 | Messages system | `migrations/036_messages_system.sql` (204 lines) | Created 3 tables. **`messages`**: `id`, `scope TEXT CHECK IN ('firm','project')`, `scope_id UUID` (polymorphic — points to firms.id or projects.id), `author_id FK→users`, `body TEXT NOT NULL`, `parent_id FK→messages` (threaded replies), `created_at`, `updated_at`. **`message_reactions`**: `message_id FK`, `user_id FK`, `emoji TEXT NOT NULL`, `UNIQUE(message_id, user_id, emoji)`. **`message_attachments`**: `message_id FK`, `file_url`, `file_name`, `file_type`, `file_size`, `uploaded_by FK`. Indexes: `idx_messages_scope_id(scope_id, created_at DESC)`, `idx_messages_parent_id`, `idx_message_reactions_message_id`. RLS: member read/write within their firms/projects | 2h 00m |
| 2 | Firms extended profile | `migrations/032_firms_extended_profile.sql`, `migrations/028_firm_extended_fields.sql` | Added to `firms`: `contact_name TEXT`, `contact_email TEXT`, `contact_role TEXT`, `contact_phone TEXT`, `location TEXT`, `website_url TEXT`, `logo_url TEXT`, `account_manager_id FK→users ON DELETE SET NULL`, `default_prompt_id FK→prompts ON DELETE SET NULL`. Updated `firms.validation.ts` to accept new fields. Updated `firms.service.ts` to include them in create/update | 1h 00m |
| 3 | Firms service + controller update | `modules/firms/firms.service.ts`, `firms.controller.ts` | Updated `createFirm` and `updateFirm` to handle all extended fields. Added `logo_url` upload via `uploadFileBuffer`. Updated `listFirms` to JOIN `users` for account manager name. Updated `getFirm` to return full extended profile including contact details | 45m |
| 4 | Users rate fields | `migrations/028_user_rate.sql` | Added `users.rate_amount NUMERIC(10,2)` and `users.rate_frequency TEXT CHECK IN ('hourly','daily','monthly','fixed')` for billing rate tracking per team member | 30m |
| 5 | Routes index update | `src/routes/index.ts` | Mounted new modules: `/task-types` (task-types router), `/org-settings` (org-settings router), `/messages` (messages router — not yet fully built but router registered). Ensured all modules export their routers correctly | 30m |
| 6 | Production DB audit | Live DB at `3.7.156.53` | Connected to `aiwealth_develop` via psql. Verified all 28+ migrations applied. Found: `member_roles` table missing (migration 019b not applied), `users.role` constraint has `project_manager` instead of `super_admin`. Documented fix SQL: `CREATE TABLE member_roles` + seed 10 roles + `ALTER TABLE users DROP/ADD CONSTRAINT users_role_check` | 1h 00m |
| 7 | Backend build & test | `tsconfig.json`, `tsconfig.test.json`, `__tests__/` | Ran `npm run build` — fixed 3 TypeScript errors in models (nullable FK types, missing `?` on optional associations). Ran `npm test` — 92 tests pass. Added `mockModels.ts` helper for Sequelize model mocking in Jest suite | 1h 00m |
| 8 | AI service update | `services/ai.service.ts` | Updated `generateTickets` to use Groq API (`llama-3.3-70b-versatile` model) instead of OpenAI. Updated mock fallback to return tasks with new 8-status values (`to_do` instead of `draft`). `AI_MODEL` constant now env-overridable | 45m |
| 9 | Fireflies service update | `services/fireflies.service.ts` | Updated mock transcript data to include `task_type_id` references. Fixed upsert logic to handle new `fetched_at` precision. Mock fallback data updated to reflect new firm/project structure | 30m |
| **Total** | | | | **8h 00m** |

---

## Weekly Summary

| Day | Date | Primary Focus | Hours |
|-----|------|--------------|-------|
| Monday | May 4 | Task status system (030), Sequelize models, Tasks service foundation, types | 8h |
| Tuesday | May 5 | Tasks service completion, Tasks controller/routes, Time logs, S3 storage layer | 8h |
| Wednesday | May 6 | Projects schema (033), Task types (035, 042), Task types module, Projects service start | 8h |
| Thursday | May 7 | Projects service completion, Project attachments (037), Active timers (038), Org settings (041), Skills fixes | 8h |
| Friday | May 8 | Messages system (036), Firms extended profile (032), Users rate fields, DB audit, build/test | 8h |
| **Total** | | | **40h** |

### Migrations Written & Applied (Week 4)

| Migration | Description | Applied |
|-----------|-------------|---------|
| `030_new_task_status_system.sql` | 8-value task status system with data migration | ✅ |
| `031_add_project_manager_role.sql` | project_manager role in users constraint | ✅ |
| `032_firms_extended_profile.sql` | Contact details, location, logo, account manager FK | ✅ |
| `033_projects_dates_priority_type.sql` | start_date, end_date, priority, type on projects | ✅ |
| `034_skills_description_color.sql` | description + color columns on skills | ✅ |
| `035_task_types_table.sql` | task_types catalog + tickets.task_type_id FK | ✅ |
| `036_messages_system.sql` | messages, message_reactions, message_attachments | ✅ |
| `037_project_attachments.sql` | project_attachments with S3 metadata | ✅ |
| `038_active_timers.sql` | Live stopwatch state per user | ✅ |
| `040_skills_update_policy.sql` | Fix RLS UPDATE policy on skills | ✅ |
| `041_org_settings.sql` | Organisation settings (logo) | ✅ |
| `042_task_type_members.sql` | task_type_members junction table | ✅ |

### Breakdown by Category

| Category | Key Files | Hours |
|----------|-----------|-------|
| DB Migrations | 12 migration files (030–042) | 8h 30m |
| Tasks Module | tasks.service.ts, tasks.controller.ts, tasks.routes.ts | 7h 00m |
| Projects Module | projects.service.ts, projects.controller.ts, project-attachments | 6h 15m |
| Task Types Module | task-types service/controller/routes, migration 035/042 | 3h 00m |
| Time Logs Module | time-logs.service.ts, time-logs.controller.ts, validation | 1h 30m |
| Storage Layer | config/storage.ts (S3 integration) | 1h 30m |
| Org Settings Module | migration 041, org-settings service/controller/routes | 1h 00m |
| Firms Extended Profile | migration 032/028, firms service/controller update | 1h 45m |
| Messages System | migration 036 | 2h 00m |
| Sequelize Models | All 12 model files + database.ts config | 2h 00m |
| Auth & Config | config/auth.ts, config/constants.ts, types/index.ts | 1h 30m |
| Services Update | ai.service.ts, fireflies.service.ts | 1h 15m |
| Build / Test / DB Audit | tsconfig, jest suite, production DB check | 2h 45m |
| **Total** | | **40h** |

---

### API Endpoints Delivered This Week

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/tasks` | member | List tasks with filters (firm, project, assignee, status, overdue) |
| POST | `/api/tasks` | admin | Create task with initial_status, project_id, assignee_ids, parent_task_id |
| GET | `/api/tasks/:id` | member | Single task with assignees, firm, project, task type |
| GET | `/api/tasks/:id/subtasks` | member | List sub-tasks of a parent task |
| PATCH | `/api/tasks/:id` | member | Update task fields, project, assignees |
| PATCH | `/api/tasks/:id/assign-approve` | admin | Assign + transition to assigned status |
| PATCH | `/api/tasks/:id/discard` | admin | Soft discard |
| POST | `/api/tasks/:id/regenerate` | admin | AI regenerate task content |
| PATCH | `/api/tasks/:id/resolve` | member | Resolve own task, insert final time log |
| DELETE | `/api/tasks/:id` | admin | Hard delete discarded task |
| PATCH | `/api/tasks/:id/archive` | admin | Archive/unarchive |
| PATCH | `/api/tasks/:id/transition` | admin | Status transition with audit log |
| GET | `/api/tasks/:id/attachments` | member | List task attachments |
| POST | `/api/tasks/:id/attachments` | member | Upload file to S3 |
| DELETE | `/api/tasks/:id/attachments/:attId` | member | Delete attachment |
| GET | `/api/tasks/:id/time-logs` | member | List time logs |
| POST | `/api/tasks/:id/time-logs` | member | Add time log |
| PATCH | `/api/tasks/:id/time-logs/:logId` | member | Edit own time log |
| DELETE | `/api/tasks/:id/time-logs/:logId` | member | Delete own time log |
| GET | `/api/projects` | member | List projects (filter: firm_id) |
| GET | `/api/projects/:id` | member | Project detail with members + task count |
| GET | `/api/projects/:id/overview` | member | Tasks grouped by status + members |
| GET | `/api/projects/:id/tasks` | admin | Lightweight task list |
| POST | `/api/projects/:id/share` | admin | Generate share token |
| GET | `/api/projects/shared/:token` | public | Public project view |
| POST | `/api/projects` | admin | Create project |
| PATCH | `/api/projects/:id` | admin | Update project |
| PATCH | `/api/projects/:id/archive` | admin | Toggle archive |
| DELETE | `/api/projects/:id` | admin | Delete project |
| GET/POST/DELETE | `/api/projects/:id/members` | admin | Manage project members |
| GET/POST/DELETE | `/api/projects/:id/attachments` | member | Manage project attachments |
| GET | `/api/task-types` | member | List task types |
| POST | `/api/task-types` | admin | Create task type |
| PATCH | `/api/task-types/:id` | admin | Update task type |
| DELETE | `/api/task-types/:id` | admin | Delete task type |
| GET/POST/DELETE | `/api/task-types/:id/members` | admin | Manage default task type members |
| GET | `/api/org-settings` | member | Get org settings |
| PATCH | `/api/org-settings` | admin | Update org settings |
| POST | `/api/org-settings/logo` | admin | Upload org logo to S3 |

---

*Generated: 2026-05-11 | Sprint: Week 4 | Project: AI Wealth Connections*
