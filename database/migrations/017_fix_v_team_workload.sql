-- Migration 017: Fix v_team_workload view
-- Problems fixed:
--   1. View may not exist — 001_schema_fixes.sql used BEGIN/COMMIT blocks
--      which Supabase SQL Editor rejects, so it was never applied.
--   2. active_tickets filtered by status = 'approved', but migration 015
--      renamed active-work tickets to 'in_progress'. Count was always 0.
--   3. Hours total included 'final' logs (resolution snapshots that duplicate
--      partial-log totals), inflating hours. Also included 'revision' markers
--      (hours = 0, harmless but semantically wrong to include).
--
-- NOTE: Do NOT wrap in BEGIN/COMMIT — Supabase SQL Editor does not support
-- explicit transaction blocks. Apply via Supabase SQL Editor.

CREATE OR REPLACE VIEW public.v_team_workload AS
SELECT
  u.id                                                                    AS user_id,
  u.name,
  u.email,
  COUNT(DISTINCT t.id)                                                    AS total_assigned,
  COUNT(DISTINCT t.id) FILTER (WHERE t.status IN ('in_progress', 'revisions'))
                                                                          AS active_tickets,
  COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'resolved')              AS resolved_tickets,
  COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'draft')                 AS draft_tickets,
  COALESCE(tl_agg.total_hours, 0)                                        AS total_hours_logged
FROM public.users u
LEFT JOIN public.tickets t ON t.assignee_id = u.id
LEFT JOIN (
  SELECT
    user_id,
    SUM(hours) AS total_hours
  FROM public.time_logs
  WHERE log_type NOT IN ('final', 'revision')
  GROUP BY user_id
) tl_agg ON tl_agg.user_id = u.id
WHERE u.role = 'member'
GROUP BY u.id, u.name, u.email, tl_agg.total_hours;

-- Re-grant after CREATE OR REPLACE (REPLACE resets privileges)
GRANT SELECT ON public.v_team_workload TO authenticated;
