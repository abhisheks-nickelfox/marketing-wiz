-- Migration 021: Add project_id and project_name to v_tickets_full
-- Do NOT wrap in BEGIN/COMMIT — Supabase SQL Editor does not support
-- explicit transaction blocks. Apply via Supabase SQL Editor.

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
  -- Aggregated time data (excludes final + revision log types)
  COALESCE(agg.total_hours, 0)  AS total_hours_spent,
  COALESCE(agg.log_count, 0)    AS time_log_count
FROM public.tickets t
LEFT JOIN public.firms    f   ON f.id = t.firm_id
LEFT JOIN public.projects p   ON p.id = t.project_id
LEFT JOIN public.users    u   ON u.id = t.assignee_id
LEFT JOIN (
  SELECT
    ticket_id,
    SUM(hours) AS total_hours,
    COUNT(*)   AS log_count
  FROM public.time_logs
  WHERE log_type NOT IN ('final', 'revision')
  GROUP BY ticket_id
) agg ON agg.ticket_id = t.id;

-- Re-grant after CREATE OR REPLACE resets privileges
GRANT SELECT ON public.v_tickets_full TO authenticated;
