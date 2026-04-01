-- ============================================================
-- MarketingWiz — Database Views & Performance Indexes Patch
-- ============================================================
-- Run this AFTER schema.sql on an existing database.
-- Safe to re-run: uses IF NOT EXISTS / CREATE OR REPLACE.
-- ============================================================

-- ============================================================
-- 1. ADDITIONAL PERFORMANCE INDEXES
-- ============================================================

-- Composite: filter tickets by firm + status (most common admin query)
CREATE INDEX IF NOT EXISTS idx_tickets_firm_status
  ON public.tickets(firm_id, status);

-- Composite: filter tickets by assignee + status (member dashboard)
CREATE INDEX IF NOT EXISTS idx_tickets_assignee_status
  ON public.tickets(assignee_id, status);

-- Ordering by updated_at (member dashboard recent tickets, admin list default)
CREATE INDEX IF NOT EXISTS idx_tickets_updated_at
  ON public.tickets(updated_at DESC);

-- time_logs by user (member total-hours queries in dashboard)
CREATE INDEX IF NOT EXISTS idx_time_logs_user_id
  ON public.time_logs(user_id);

-- processing_sessions by firm and transcript (transcript processing flow)
CREATE INDEX IF NOT EXISTS idx_processing_sessions_firm_id
  ON public.processing_sessions(firm_id);

CREATE INDEX IF NOT EXISTS idx_processing_sessions_transcript_id
  ON public.processing_sessions(transcript_id);

-- transcripts ordered by call_date (recent transcripts in dashboard)
CREATE INDEX IF NOT EXISTS idx_transcripts_call_date
  ON public.transcripts(call_date DESC);

-- ============================================================
-- 2. DATABASE VIEWS
-- ============================================================

-- ─── v_tickets_full ──────────────────────────────────────────
-- Tickets enriched with firm name, assignee details, and
-- aggregated time data. Eliminates N+1 joins in the API.
-- Used by: ticket list endpoints, admin dashboard.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.v_tickets_full AS
SELECT
  t.id,
  t.session_id,
  t.firm_id,
  t.assignee_id,
  t.title,
  t.description,
  t.type,
  t.priority,
  t.status,
  t.change_note,
  t.estimated_hours,
  t.ai_generated,
  t.edited,
  t.created_at,
  t.updated_at,
  -- Firm info
  f.name                          AS firm_name,
  -- Assignee info (NULL if unassigned)
  u.id                            AS assignee_user_id,
  u.name                          AS assignee_name,
  u.email                         AS assignee_email,
  -- Aggregated time data
  COALESCE(agg.total_hours, 0)    AS total_hours_spent,
  COALESCE(agg.log_count, 0)      AS time_log_count
FROM public.tickets t
LEFT JOIN public.firms      f   ON f.id          = t.firm_id
LEFT JOIN public.users      u   ON u.id          = t.assignee_id
LEFT JOIN (
  SELECT
    ticket_id,
    SUM(hours)   AS total_hours,
    COUNT(*)     AS log_count
  FROM public.time_logs
  GROUP BY ticket_id
) agg ON agg.ticket_id = t.id;

-- RLS on v_tickets_full:
-- The view is SECURITY INVOKER (default), so underlying table
-- RLS policies on public.tickets apply automatically.
-- Admins see all rows; members see only rows where assignee_id = auth.uid().
GRANT SELECT ON public.v_tickets_full TO authenticated;


-- ─── v_firm_ticket_stats ─────────────────────────────────────
-- Per-firm aggregate: ticket counts by status and total hours
-- spent. Replaces multiple COUNT queries in the admin dashboard.
-- Used by: admin dashboard, firms list.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.v_firm_ticket_stats AS
SELECT
  f.id                                                           AS firm_id,
  f.name                                                         AS firm_name,
  f.contact_name,
  f.contact_email,
  f.created_at                                                   AS firm_created_at,
  COUNT(DISTINCT t.id)                                           AS total_tickets,
  COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'draft')        AS draft_count,
  COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'approved')     AS approved_count,
  COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'resolved')     AS resolved_count,
  COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'discarded')    AS discarded_count,
  COALESCE(SUM(tl.hours), 0)                                    AS total_hours_spent,
  MAX(t.created_at)                                             AS last_ticket_at
FROM public.firms f
LEFT JOIN public.tickets    t   ON t.firm_id    = f.id
LEFT JOIN public.time_logs  tl  ON tl.ticket_id = t.id
GROUP BY f.id, f.name, f.contact_name, f.contact_email, f.created_at;

-- Members can read firms (via underlying firms RLS policy), so
-- they can also read this aggregated view.
GRANT SELECT ON public.v_firm_ticket_stats TO authenticated;


-- ─── v_team_workload ─────────────────────────────────────────
-- Per-member workload: ticket counts by status and total hours
-- logged. Powers the admin team workload panel and eliminates
-- N+3 queries (one SELECT + 2 COUNTs per member).
-- Used by: admin dashboard team workload section.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.v_team_workload AS
SELECT
  u.id                                                           AS user_id,
  u.name,
  u.email,
  COUNT(DISTINCT t.id)                                           AS total_assigned,
  COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'approved')     AS active_tickets,
  COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'resolved')     AS resolved_tickets,
  COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'draft')        AS draft_tickets,
  COALESCE(SUM(tl.hours), 0)                                    AS total_hours_logged
FROM public.users u
LEFT JOIN public.tickets    t   ON t.assignee_id = u.id
LEFT JOIN public.time_logs  tl  ON tl.user_id    = u.id
WHERE u.role = 'member'
GROUP BY u.id, u.name, u.email;

-- Admins can read all users; members can read their own row.
-- The underlying users RLS policies propagate through this view.
GRANT SELECT ON public.v_team_workload TO authenticated;


-- ============================================================
-- 3. VERIFICATION QUERIES
-- Run these to confirm views and indexes exist after applying.
-- ============================================================

-- Check views:
-- SELECT viewname FROM pg_views WHERE schemaname = 'public' AND viewname LIKE 'v_%';

-- Check indexes:
-- SELECT indexname, tablename FROM pg_indexes WHERE schemaname = 'public' ORDER BY tablename, indexname;

-- Sample view queries:
-- SELECT * FROM public.v_tickets_full LIMIT 5;
-- SELECT * FROM public.v_firm_ticket_stats ORDER BY total_tickets DESC;
-- SELECT * FROM public.v_team_workload ORDER BY active_tickets DESC;
