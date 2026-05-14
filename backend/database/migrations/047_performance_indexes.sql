-- Migration 047: Performance indexes
-- Adds composite and partial indexes to eliminate common full-table scans
-- in the tasks list, project overview, and time-log aggregation queries.
-- Safe to apply multiple times — all statements use IF NOT EXISTS.

-- Sub-task lookups: filters tickets by parent_task_id (partial — only rows that
-- are actually sub-tasks, keeping the index small)
CREATE INDEX IF NOT EXISTS idx_tickets_parent_task_id
  ON public.tickets(parent_task_id)
  WHERE parent_task_id IS NOT NULL;

-- Processing-session-based ticket lookups (transcript → tickets pipeline)
CREATE INDEX IF NOT EXISTS idx_tickets_session_id
  ON public.tickets(session_id)
  WHERE session_id IS NOT NULL;

-- Time-log type filtering (used in every aggregation query to exclude
-- final/revision/transition log types)
CREATE INDEX IF NOT EXISTS idx_time_logs_log_type
  ON public.time_logs(log_type);

-- Composite index for the common (ticket_id, log_type) filter pattern used in
-- time-log aggregations and project overview queries
CREATE INDEX IF NOT EXISTS idx_time_logs_ticket_id_log_type
  ON public.time_logs(ticket_id, log_type);

-- Composite index for the (status, archived) filter used in task list queries
-- and the dashboard overdue-ticket query
CREATE INDEX IF NOT EXISTS idx_tickets_status_archived
  ON public.tickets(status, archived);

-- Composite partial index for project overview and task-list filter by project
CREATE INDEX IF NOT EXISTS idx_tickets_project_id_status
  ON public.tickets(project_id, status)
  WHERE project_id IS NOT NULL;

-- Composite partial index for firm-scoped task list queries that also filter
-- by archived state
CREATE INDEX IF NOT EXISTS idx_tickets_firm_id_archived
  ON public.tickets(firm_id, archived);

-- task_assignees junction-table lookups (used on every task fetch and in the
-- assignee-condition helper)
CREATE INDEX IF NOT EXISTS idx_task_assignees_task_id
  ON public.task_assignees(task_id);

CREATE INDEX IF NOT EXISTS idx_task_assignees_user_id
  ON public.task_assignees(user_id);
