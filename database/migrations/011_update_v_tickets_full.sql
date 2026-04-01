-- ============================================================
-- Migration: 011_update_v_tickets_full.sql
-- Date:      2026-03-30
-- Author:    MarketingWiz DB Engineering
-- ============================================================
-- Summary: Add deadline, regeneration_count, and last_regenerated_at
--          to the v_tickets_full view.
--
-- WHY THIS IS NEEDED:
--   v_tickets_full was defined in views_and_indexes.sql before migrations
--   005 and 006 added new columns to the tickets table:
--
--     005_add_deadline.sql
--       tickets.deadline DATE — nullable, due-date for a ticket
--
--     006_optimize_transcript_tickets.sql
--       tickets.regeneration_count INTEGER NOT NULL DEFAULT 0
--         Monotonically incrementing count of AI regeneration cycles.
--       tickets.last_regenerated_at TIMESTAMPTZ — nullable, timestamp of
--         the most recent AI regeneration (NULL = never regenerated).
--
--   Any query or API endpoint that selects from v_tickets_full currently
--   does NOT receive these three columns. This means:
--     - The deadline field is invisible to all ticket list and detail
--       endpoints that rely on v_tickets_full.
--     - Regeneration metadata (used for prompt quality auditing) is
--       unavailable to the admin ticket review UI.
--
-- APPROACH:
--   CREATE OR REPLACE VIEW is used so the view definition is atomically
--   swapped in without dropping dependent objects (GRANTs are reset by
--   OR REPLACE, so we re-issue the GRANT immediately after).
--
--   The three new columns are appended at the end of the SELECT list
--   (after updated_at) to avoid breaking any positional column references
--   in existing application code, though the backend uses named columns
--   throughout (no SELECT *), so ordering is not strictly critical.
--
-- COLUMN PLACEMENT:
--   deadline            — placed after updated_at (audit columns block)
--   regeneration_count  — after deadline (regeneration metadata block)
--   last_regenerated_at — after regeneration_count (pairs naturally)
--
-- GRANT:
--   CREATE OR REPLACE VIEW resets all previously granted privileges on
--   the view. The GRANT SELECT to authenticated below re-establishes
--   the same grant that views_and_indexes.sql originally issued.
--   The backend (service-role) is unaffected — it bypasses grants.
--
-- Idempotency:
--   CREATE OR REPLACE VIEW is inherently idempotent; safe to re-run.
--   The GRANT is also safe to re-run (GRANT is a no-op if already granted).
--
-- Rollback: DOWN migration block is provided at the bottom of this file.
--
-- NOTE: Do NOT wrap in BEGIN/COMMIT — Supabase SQL Editor does not
-- support explicit transaction blocks. Apply via Supabase SQL Editor.
-- ============================================================


-- ============================================================
-- Replace v_tickets_full with the complete column set
-- ============================================================
-- Source definition: views_and_indexes.sql (original)
-- Additions (marked with NEW): deadline, regeneration_count, last_regenerated_at

CREATE OR REPLACE VIEW v_tickets_full AS
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
  -- Aggregated time data (subquery avoids Cartesian product with time_logs)
  COALESCE(agg.total_hours, 0)    AS total_hours_spent,
  COALESCE(agg.log_count, 0)      AS time_log_count,
  -- NEW (migration 005): due-date set by admin during ticket review
  t.deadline,
  -- NEW (migration 006): how many times the AI has regenerated this ticket;
  -- 0 = accepted on first draft or manually created ticket
  t.regeneration_count,
  -- NEW (migration 006): timestamp of the most recent AI regeneration;
  -- NULL = never regenerated (first-pass draft or manually created ticket)
  t.last_regenerated_at
FROM tickets t
LEFT JOIN firms      f   ON f.id          = t.firm_id
LEFT JOIN users      u   ON u.id          = t.assignee_id
LEFT JOIN (
  SELECT
    ticket_id,
    SUM(hours)   AS total_hours,
    COUNT(*)     AS log_count
  FROM time_logs
  GROUP BY ticket_id
) agg ON agg.ticket_id = t.id;


-- ============================================================
-- Re-grant SELECT after CREATE OR REPLACE resets privileges
-- ============================================================
-- CREATE OR REPLACE VIEW resets all grants on the view as a side effect.
-- This GRANT re-establishes the same access that views_and_indexes.sql
-- originally issued. RLS on the underlying tickets table still applies
-- (the view is SECURITY INVOKER by default), so members see only their
-- assigned tickets and admins see all tickets.

GRANT SELECT ON v_tickets_full TO authenticated;


-- ============================================================
-- DOWN MIGRATION (rollback)
-- ============================================================
-- Run this block manually to reverse all changes in this file.
-- This restores v_tickets_full to its pre-011 definition (the three
-- new columns are removed). The underlying tickets table columns
-- (deadline, regeneration_count, last_regenerated_at) are NOT touched
-- — this rollback only affects the view definition.
--
-- Do NOT run automatically — apply via Supabase SQL Editor as a
-- standalone block after confirming the up migration is being rolled back.
-- ============================================================

/*  ---- BEGIN DOWN MIGRATION (do not run automatically) ----

CREATE OR REPLACE VIEW v_tickets_full AS
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
  COALESCE(agg.log_count, 0)      AS time_log_count,
  -- Restore deadline to NULL to signal rollback (column still exists on table)
  NULL::date                      AS deadline,
  NULL::integer                   AS regeneration_count,
  NULL::timestamptz               AS last_regenerated_at
FROM tickets t
LEFT JOIN firms      f   ON f.id          = t.firm_id
LEFT JOIN users      u   ON u.id          = t.assignee_id
LEFT JOIN (
  SELECT
    ticket_id,
    SUM(hours)   AS total_hours,
    COUNT(*)     AS log_count
  FROM time_logs
  GROUP BY ticket_id
) agg ON agg.ticket_id = t.id;

GRANT SELECT ON v_tickets_full TO authenticated;

---- END DOWN MIGRATION ---- */
