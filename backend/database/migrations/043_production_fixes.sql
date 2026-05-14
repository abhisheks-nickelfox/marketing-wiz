-- ============================================================
-- Migration 043: Production fixes — task_assignees, view rebuild,
--                notifications columns, FK indexes, projects trigger
--
-- Groups several additive fixes that are safe to apply to a
-- production database already at migration 042.
--
-- Sections:
--   A. task_assignees — formal migration (runtime safety net in
--      database.ts applyMissingSchema is retained as a dev guard)
--   B. v_firm_ticket_stats — rebuild with new status vocabulary
--      from migration 030 (to_do / completed replace draft / approved)
--   C. notifications — add type + title columns safely; add DELETE RLS
--   D. FK performance indexes missing from earlier migrations
--   E. projects updated_at auto-trigger (belt-and-suspenders)
--
-- Do NOT wrap in BEGIN/COMMIT — Supabase SQL Editor rejects explicit
-- transaction blocks. Apply via Supabase SQL Editor.
-- ============================================================


-- ============================================================
-- A. task_assignees — many-to-many ticket ↔ user (multi-assignee)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.task_assignees (
  task_id   UUID        NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  user_id   UUID        NOT NULL REFERENCES public.users(id)   ON DELETE CASCADE,
  added_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (task_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_task_assignees_task_id ON public.task_assignees(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignees_user_id ON public.task_assignees(user_id);

ALTER TABLE public.task_assignees ENABLE ROW LEVEL SECURITY;

-- All authenticated roles can read assignee records
CREATE POLICY "task_assignees_select"
  ON public.task_assignees FOR SELECT
  USING (true);

-- Only admins and project managers can assign/remove
CREATE POLICY "task_assignees_insert"
  ON public.task_assignees FOR INSERT
  WITH CHECK (public.current_user_role() IN ('admin', 'project_manager'));

CREATE POLICY "task_assignees_delete"
  ON public.task_assignees FOR DELETE
  USING (public.current_user_role() IN ('admin', 'project_manager'));

GRANT SELECT, INSERT, DELETE ON public.task_assignees TO authenticated;


-- ============================================================
-- B. v_firm_ticket_stats — rebuild with migration-030 status values
--
-- The legacy view (views_and_indexes.sql) counted:
--   draft_count    WHERE status = 'draft'
--   approved_count WHERE status = 'approved'
-- Migration 030 renamed: draft → to_do, approved → assigned/in_progress.
-- Counts are now:
--   to_do_count   WHERE status = 'to_do'
--   completed_count WHERE status = 'completed'
-- ============================================================

CREATE OR REPLACE VIEW public.v_firm_ticket_stats AS
SELECT
  f.id                                                                    AS firm_id,
  f.name                                                                  AS firm_name,
  f.contact_name,
  f.contact_email,
  f.created_at                                                            AS firm_created_at,
  COUNT(DISTINCT t.id)                                                    AS total_tickets,
  COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'to_do')                 AS draft_count,
  COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'completed')             AS approved_count,
  COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'in_progress')           AS in_progress_count,
  COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'assigned')              AS assigned_count,
  COALESCE(SUM(tl.hours), 0)                                             AS total_hours_spent,
  MAX(t.created_at)                                                       AS last_ticket_at
FROM public.firms f
LEFT JOIN public.tickets    t   ON t.firm_id    = f.id
LEFT JOIN public.time_logs  tl  ON tl.ticket_id = t.id
GROUP BY f.id, f.name, f.contact_name, f.contact_email, f.created_at;

GRANT SELECT ON public.v_firm_ticket_stats TO authenticated;


-- ============================================================
-- C. notifications — add type and title columns, DELETE RLS policy
--
-- type: categorises the notification (ticket_assigned, revisions_requested,
--       general, etc.). Defaulting to 'general' keeps existing rows valid.
-- title: short heading for the notification toast/list item.
--        Was previously treated as NOT NULL in the model but may be absent
--        from the DB schema depending on when the table was created. Adding
--        as nullable so existing NULL rows do not violate the constraint.
-- ============================================================

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS type  TEXT NOT NULL DEFAULT 'general';

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS title TEXT;

-- Allow users to delete their own notifications (e.g. "dismiss all")
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'notifications'
      AND policyname = 'notifications_delete_own'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "notifications_delete_own"
        ON public.notifications FOR DELETE
        USING (user_id = auth.uid())
    $p$;
  END IF;
END $$;


-- ============================================================
-- D. FK performance indexes missing from earlier migrations
-- ============================================================

-- processing_sessions.prompt_id — joins prompts for "which prompt generated X?"
CREATE INDEX IF NOT EXISTS idx_processing_sessions_prompt_id
  ON public.processing_sessions(prompt_id);

-- processing_sessions.created_by — user deletion guard + audit queries
CREATE INDEX IF NOT EXISTS idx_processing_sessions_created_by
  ON public.processing_sessions(created_by);

-- user_skills.skill_id — joining skills catalog, cascading skill deletes
CREATE INDEX IF NOT EXISTS idx_user_skills_skill_id
  ON public.user_skills(skill_id);

-- notifications: fast unread count per user (most polled endpoint)
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications(user_id, read)
  WHERE read = false;


-- ============================================================
-- E. projects updated_at auto-trigger
--
-- Migration 020 created the projects table with an updated_at column
-- and was expected to wire a trigger. If the trigger was not applied
-- (e.g. on a dev DB created from the safety-net patch in database.ts),
-- this block creates it idempotently.
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_projects_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_projects_updated_at ON public.projects;

CREATE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_projects_updated_at();
