-- ============================================================
-- Migration 030: New Task Status System
-- Replaces the 10-value legacy status set with an 8-value set
-- that aligns with the new project-oriented workflow.
--
-- OLD statuses:
--   draft, in_progress, resolved, internal_review, client_review,
--   compliance_review, approved, closed, revisions, discarded
--
-- NEW statuses:
--   to_do, assigned, in_progress, revisions, internal_review,
--   client_review, completed, blocked
--
-- DATA MIGRATION MAP:
--   draft              → to_do
--   in_progress        → in_progress   (no change)
--   resolved           → completed
--   internal_review    → internal_review (no change)
--   client_review      → client_review  (no change)
--   compliance_review  → internal_review
--     (compliance_review is collapsed into internal_review — there is
--      no 1:1 target in the new set; internal_review is the closest
--      active-review state. Verify with product before applying if
--      any live compliance_review tickets exist.)
--   approved (with assignee_id NOT NULL) → assigned
--   approved (with assignee_id IS NULL)  → in_progress
--     (Rationale: post-migration 015, "approved" means admin sign-off
--      on a draft. With an assignee it maps to "assigned"; without one
--      it maps to "in_progress" as an ownerless active task.)
--   closed             → completed
--   revisions          → revisions     (no change)
--   discarded          → to_do
--     (Discarded tasks re-enter the backlog as to_do so they are not
--      silently lost. If product wants them permanently hidden instead,
--      replace this with a DELETE or a soft-delete flag before running.)
--
-- RISK FLAGS:
--   1. compliance_review → internal_review: any ticket in compliance_review
--      loses the compliance-stage distinction permanently. Run
--      SELECT id, title FROM tickets WHERE status = 'compliance_review'
--      before applying and archive/export if needed.
--   2. discarded → to_do: discarded tickets reappear in the backlog.
--      If that is undesirable, delete them first:
--      DELETE FROM tickets WHERE status = 'discarded';
--   3. approved (no assignee) → in_progress: these tickets will appear
--      as active work with no owner. Assign or triage after migration.
--   4. All existing partial indexes that reference legacy status values
--      (idx_tickets_overdue_deadline, idx_tickets_approved_staleness,
--       idx_tickets_draft_firm_created_at) are rebuilt below with new
--      status predicates.
--   5. v_tickets_full is rebuilt. v_team_workload references statuses
--      inline — it is also rebuilt here.
--
-- Do NOT wrap in BEGIN/COMMIT — Supabase SQL Editor rejects explicit
-- transaction blocks. Apply via Supabase SQL Editor.
-- ============================================================


-- ============================================================
-- STEP 1: Drop the old CHECK constraint
-- ============================================================
ALTER TABLE public.tickets
  DROP CONSTRAINT IF EXISTS tickets_status_check;


-- ============================================================
-- STEP 2: Data migration — remap legacy statuses to new set
-- Order matters: most specific predicates first to avoid double-update.
-- ============================================================

-- compliance_review → internal_review (collapse)
UPDATE public.tickets SET status = 'internal_review'
  WHERE status = 'compliance_review';

-- approved with assignee → assigned
UPDATE public.tickets SET status = 'assigned'
  WHERE status = 'approved' AND assignee_id IS NOT NULL;

-- approved without assignee → in_progress
UPDATE public.tickets SET status = 'in_progress'
  WHERE status = 'approved' AND assignee_id IS NULL;

-- draft → to_do
UPDATE public.tickets SET status = 'to_do'
  WHERE status = 'draft';

-- resolved → completed
UPDATE public.tickets SET status = 'completed'
  WHERE status = 'resolved';

-- closed → completed
UPDATE public.tickets SET status = 'completed'
  WHERE status = 'closed';

-- discarded → to_do
UPDATE public.tickets SET status = 'to_do'
  WHERE status = 'discarded';

-- in_progress, internal_review, client_review, revisions — unchanged


-- ============================================================
-- STEP 3: Add the new CHECK constraint
-- ============================================================
ALTER TABLE public.tickets
  ADD CONSTRAINT tickets_status_check CHECK (
    status IN (
      'to_do',
      'assigned',
      'in_progress',
      'revisions',
      'internal_review',
      'client_review',
      'completed',
      'blocked'
    )
  );


-- ============================================================
-- STEP 4: Drop stale partial indexes that encode legacy status values
-- ============================================================
DROP INDEX IF EXISTS public.idx_tickets_overdue_deadline;
DROP INDEX IF EXISTS public.idx_tickets_approved_staleness;
DROP INDEX IF EXISTS public.idx_tickets_draft_firm_created_at;


-- ============================================================
-- STEP 5: Rebuild partial indexes for new status set
-- ============================================================

-- Active (open) tickets with a deadline — serves overdue query
-- Active statuses in the new set: to_do, assigned, in_progress, revisions,
-- internal_review, client_review (not completed/blocked — blocked is still
-- open but excluded from overdue tracking as it is explicitly stalled)
CREATE INDEX IF NOT EXISTS idx_tickets_overdue_deadline
  ON public.tickets (deadline)
  WHERE deadline IS NOT NULL
    AND archived = FALSE
    AND status IN (
      'to_do', 'assigned', 'in_progress', 'revisions',
      'internal_review', 'client_review'
    );

-- Draft queue (to_do) per firm, newest first
CREATE INDEX IF NOT EXISTS idx_tickets_to_do_firm_created_at
  ON public.tickets (firm_id, created_at DESC)
  WHERE status = 'to_do';

-- Assigned tickets per assignee (for member dashboard queries)
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_assignee
  ON public.tickets (assignee_id)
  WHERE status = 'assigned' AND archived = FALSE;

-- Composite index for the most common admin list query: firm + status
CREATE INDEX IF NOT EXISTS idx_tickets_firm_status
  ON public.tickets (firm_id, status)
  WHERE archived = FALSE;


-- ============================================================
-- STEP 6: Rebuild v_tickets_full with new statuses + project_name
-- ============================================================
DROP VIEW IF EXISTS public.v_tickets_full;

CREATE VIEW public.v_tickets_full AS
SELECT
  t.id,
  t.session_id,
  t.firm_id,
  t.assignee_id,
  t.project_id,
  t.title,
  t.description,
  t.type,
  t.priority,
  t.status,
  t.change_note,
  t.estimated_hours,
  t.ai_generated,
  t.edited,
  t.archived,
  t.revision_count,
  t.created_at,
  t.updated_at,
  t.deadline,
  t.regeneration_count,
  t.last_regenerated_at,
  -- Firm info
  f.name                        AS firm_name,
  -- Project info (NULL if ticket has no project)
  p.name                        AS project_name,
  -- Assignee info (NULL if unassigned)
  u.id                          AS assignee_user_id,
  u.name                        AS assignee_name,
  u.email                       AS assignee_email,
  -- Aggregated time (excludes final + revision log types)
  COALESCE(agg.total_hours, 0)  AS total_hours_spent,
  COALESCE(agg.log_count, 0)    AS time_log_count
FROM public.tickets t
LEFT JOIN public.firms    f   ON f.id = t.firm_id
LEFT JOIN public.projects p   ON p.id = t.project_id
LEFT JOIN public.users    u   ON u.id = t.assignee_id
LEFT JOIN (
  SELECT
    ticket_id,
    SUM(hours)  AS total_hours,
    COUNT(*)    AS log_count
  FROM public.time_logs
  WHERE log_type NOT IN ('final', 'revision', 'transition')
  GROUP BY ticket_id
) agg ON agg.ticket_id = t.id;

GRANT SELECT ON public.v_tickets_full TO authenticated;


-- ============================================================
-- STEP 7: Rebuild v_team_workload with new active statuses
-- ============================================================
CREATE OR REPLACE VIEW public.v_team_workload AS
SELECT
  u.id                                                                        AS user_id,
  u.name,
  u.email,
  COUNT(DISTINCT t.id)                                                        AS total_assigned,
  COUNT(DISTINCT t.id) FILTER (
    WHERE t.status IN ('assigned', 'in_progress', 'revisions')
  )                                                                           AS active_tickets,
  COUNT(DISTINCT t.id) FILTER (
    WHERE t.status = 'completed'
  )                                                                           AS resolved_tickets,
  COUNT(DISTINCT t.id) FILTER (
    WHERE t.status = 'to_do'
  )                                                                           AS draft_tickets,
  COALESCE(tl_agg.total_hours, 0)                                            AS total_hours_logged
FROM public.users u
LEFT JOIN public.tickets t ON t.assignee_id = u.id AND t.archived = FALSE
LEFT JOIN (
  SELECT
    user_id,
    SUM(hours) AS total_hours
  FROM public.time_logs
  WHERE log_type NOT IN ('final', 'revision', 'transition')
  GROUP BY user_id
) tl_agg ON tl_agg.user_id = u.id
WHERE u.role IN ('member', 'project_manager')
GROUP BY u.id, u.name, u.email, tl_agg.total_hours;

GRANT SELECT ON public.v_team_workload TO authenticated;


-- ============================================================
-- DOWN MIGRATION (manual rollback only)
-- ============================================================
/*

-- 1. Drop new constraint
ALTER TABLE public.tickets DROP CONSTRAINT IF EXISTS tickets_status_check;

-- 2. Remap new statuses back to legacy (lossy — compliance_review data
--    cannot be recovered; discarded data cannot be recovered)
UPDATE public.tickets SET status = 'draft'    WHERE status = 'to_do';
UPDATE public.tickets SET status = 'approved' WHERE status = 'assigned';
UPDATE public.tickets SET status = 'resolved' WHERE status = 'completed';
UPDATE public.tickets SET status = 'draft'    WHERE status = 'blocked';

-- 3. Restore old constraint
ALTER TABLE public.tickets ADD CONSTRAINT tickets_status_check CHECK (
  status IN (
    'draft', 'in_progress', 'resolved', 'internal_review', 'client_review',
    'compliance_review', 'approved', 'closed', 'revisions', 'discarded'
  )
);

-- 4. Drop new indexes
DROP INDEX IF EXISTS public.idx_tickets_overdue_deadline;
DROP INDEX IF EXISTS public.idx_tickets_to_do_firm_created_at;
DROP INDEX IF EXISTS public.idx_tickets_assigned_assignee;
DROP INDEX IF EXISTS public.idx_tickets_firm_status;

-- 5. Restore old indexes (copy from migrations 003, 006, 022)

*/
