-- ============================================================
-- Migration: 004_add_last_ticket_at.sql
-- Date:      2026-03-30
-- Author:    MarketingWiz DB Engineering
-- ============================================================
-- Summary:
--   FIX 01 (HIGH) v_firm_ticket_stats — add last_ticket_at column.
--
--   The backend controller (firms.controller.ts) reads r.last_ticket_at
--   from this view to populate the "Last Activity" column on the Firms
--   list page. The column was never selected in the view, so the field
--   was always NULL and the UI always displayed "—".
--
--   Fix: add MAX(t.created_at) AS last_ticket_at to the SELECT list.
--   MAX over a LEFT JOIN returns NULL when the firm has no tickets,
--   which is correct — the controller already handles NULL as "—".
--
--   This migration rebuilds the view in full to preserve the FIX 02
--   change from migration 001 (discarded-ticket hour exclusion via
--   the tl_agg subquery).
--
-- Idempotency: CREATE OR REPLACE VIEW is safe to re-run.
-- Rollback: DOWN migration block at the bottom of this file.
-- ============================================================

-- ============================================================
-- UP — rebuild v_firm_ticket_stats with last_ticket_at
-- NOTE: Paste only this block into Supabase SQL Editor.
--       Do NOT wrap in BEGIN/COMMIT — Supabase does not support
--       explicit transaction blocks in the SQL editor.
-- ============================================================

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
  COALESCE(SUM(tl_agg.total_hours), 0)                          AS total_hours_spent,
  MAX(t.created_at)                                             AS last_ticket_at
FROM firms f
LEFT JOIN tickets t ON t.firm_id = f.id
LEFT JOIN (
  SELECT tl.ticket_id, SUM(tl.hours) AS total_hours
  FROM time_logs tl
  JOIN tickets t2 ON t2.id = tl.ticket_id
  WHERE t2.status != 'discarded'
  GROUP BY tl.ticket_id
) tl_agg ON tl_agg.ticket_id = t.id
GROUP BY f.id, f.name, f.contact_name, f.contact_email, f.created_at;

GRANT SELECT ON v_firm_ticket_stats TO authenticated;


-- ============================================================
-- DOWN MIGRATION (rollback)
-- ============================================================
-- Restores v_firm_ticket_stats to the state left by migration 001:
-- discarded-ticket hour exclusion intact, last_ticket_at removed.
-- Run this block manually as a standalone transaction.
-- ============================================================

/*  ---- BEGIN DOWN MIGRATION (do not run automatically) ----

BEGIN;

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
  COALESCE(SUM(tl_agg.total_hours), 0)                          AS total_hours_spent
FROM public.firms f
LEFT JOIN public.tickets t ON t.firm_id = f.id
LEFT JOIN (
  SELECT tl.ticket_id, SUM(tl.hours) AS total_hours
  FROM public.time_logs tl
  JOIN public.tickets t2 ON t2.id = tl.ticket_id
  WHERE t2.status != 'discarded'
  GROUP BY tl.ticket_id
) tl_agg ON tl_agg.ticket_id = t.id
GROUP BY f.id, f.name, f.contact_name, f.contact_email, f.created_at;

GRANT SELECT ON public.v_firm_ticket_stats TO authenticated;

COMMIT;

---- END DOWN MIGRATION ---- */
