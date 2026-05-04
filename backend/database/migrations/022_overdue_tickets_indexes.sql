-- ============================================================
-- Migration: 022_overdue_tickets_indexes.sql
-- Date:      2026-04-06
-- Author:    MarketingWiz DB Engineering
-- ============================================================
-- Summary of changes:
--
--   INDEX 01  tickets: partial index on (deadline)
--             WHERE deadline IS NOT NULL
--               AND archived = FALSE
--               AND status IN (active statuses)
--             Serves the "deadline has passed and ticket is still open" branch
--             of the overdue tickets query.
--
--   INDEX 02  tickets: partial index on (status, updated_at)
--             WHERE status = 'approved'
--               AND archived = FALSE
--             Serves the "approved for 7+ days with no deadline" branch of
--             the overdue tickets query.
--
-- NOTE: Do NOT wrap in BEGIN/COMMIT — Supabase SQL Editor does not support
-- explicit transaction blocks. Apply via Supabase SQL Editor.
-- ============================================================


-- ============================================================
-- INDEX 01 — partial index on deadline for active, non-archived tickets
-- ============================================================
-- Serves the first branch of the overdue definition:
--
--   SELECT * FROM public.tickets
--   WHERE deadline < CURRENT_DATE
--     AND archived = FALSE
--     AND status IN (
--       'draft', 'in_progress', 'revisions',
--       'internal_review', 'client_review', 'compliance_review'
--     );
--
-- Design decisions:
--
--   deadline IS NOT NULL  — Rows with no deadline can never satisfy
--     deadline < CURRENT_DATE. Excluding them keeps the index small and
--     means null-deadline tickets never enter this index at all.
--
--   archived = FALSE  — Archived tickets are excluded from the overdue
--     feature entirely (they are soft-deleted from the active workflow).
--     Excluding archived rows avoids polluting the index with noise.
--
--   status IN (active statuses)  — Terminal statuses (closed, discarded)
--     and pipeline-complete statuses (approved, resolved) are excluded
--     because only actively-open work can be overdue on a deadline basis.
--     This keeps the index small relative to the full tickets table and
--     makes the WHERE status IN (...) filter effectively free after the
--     index predicate is satisfied.
--
--   Column: deadline  — Sorted ascending so a range scan for
--     deadline < CURRENT_DATE reads contiguous leaf pages from the start
--     of the B-tree.
--
-- Write overhead: low. Index maintenance fires only on INSERT with a
-- non-null deadline and status updates that move a ticket into or out of
-- the covered active-status set. Deadline-bearing tickets are a minority
-- of all ticket writes.
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_tickets_overdue_deadline
  ON public.tickets (deadline)
  WHERE deadline IS NOT NULL
    AND archived = FALSE
    AND status IN (
      'draft',
      'in_progress',
      'revisions',
      'internal_review',
      'client_review',
      'compliance_review'
    );


-- ============================================================
-- INDEX 02 — partial index on (status, updated_at) for stale approved tickets
-- ============================================================
-- Serves the second branch of the overdue definition:
--
--   SELECT * FROM public.tickets
--   WHERE status = 'approved'
--     AND archived = FALSE
--     AND updated_at < NOW() - INTERVAL '7 days';
--
-- Design decisions:
--
--   status = 'approved'  — The partial predicate fixes status, so the
--     index only covers approved rows. This is intentionally narrow:
--     the "7+ days with no action" rule is specific to the approved state
--     (client signed off but the ticket was never formally closed).
--
--   archived = FALSE  — Same reasoning as INDEX 01: archived tickets
--     are out-of-scope for overdue tracking.
--
--   Column order: (status, updated_at)
--     status  — equality predicate, listed first. With the partial
--       predicate already fixing status = 'approved', this column is
--       technically redundant in the WHERE but is included in the index
--       definition so that the planner can satisfy the status equality
--       filter via the index key rather than a recheck.
--     updated_at  — range predicate (< NOW() - 7 days). Listed second
--       so the B-tree can do a forward range scan after pinning on
--       status, returning only rows older than the threshold.
--
-- Note on updated_at vs created_at: The overdue rule is "approved for
-- 7+ days". updated_at captures the last time the row was modified,
-- which includes the moment it transitioned to 'approved'. Using
-- updated_at rather than created_at is correct for this rule because
-- we want to measure time spent in the approved state, and any
-- subsequent edit (e.g. updating estimated_hours) refreshes updated_at,
-- effectively resetting the 7-day clock. This is an intentional product
-- decision: editing an approved ticket signals active engagement.
--
-- Write overhead: minimal. Only rows whose status is 'approved' and
-- archived = FALSE enter this index. Transitions away from 'approved'
-- (to 'closed') remove the row from the index immediately.
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_tickets_approved_staleness
  ON public.tickets (status, updated_at)
  WHERE status = 'approved'
    AND archived = FALSE;


-- ============================================================
-- DOWN MIGRATION (rollback)
-- ============================================================
-- Run the statements below manually to reverse this migration.
-- Do NOT run the block automatically during normal deployments.
-- ============================================================

/*  ---- BEGIN DOWN MIGRATION (do not run automatically) ----

DROP INDEX IF EXISTS public.idx_tickets_overdue_deadline;
DROP INDEX IF EXISTS public.idx_tickets_approved_staleness;

---- END DOWN MIGRATION ---- */
