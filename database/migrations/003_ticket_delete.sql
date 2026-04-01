-- ============================================================
-- Migration: 003_ticket_delete.sql
-- Date:      2026-03-28
-- Author:    MarketingWiz DB Engineering
-- ============================================================
-- Summary of changes:
--
--   FIX 01 (LOW)    tickets: add partial composite index
--                   (firm_id, created_at DESC) WHERE status = 'discarded'
--                   to serve the "delete discarded tickets for a firm"
--                   query pattern efficiently.
--
-- Context / safety analysis
-- --------------------------
-- Hard-deleting a discarded ticket is safe with the current schema:
--
--   - The only FK referencing tickets.id is time_logs.ticket_id, and it
--     is declared ON DELETE CASCADE. All child time_log rows are removed
--     automatically in the same statement. idx_time_logs_ticket_id
--     (schema.sql) ensures the cascade is an index scan, not a seq-scan.
--
--   - No other table holds a FK to tickets.id. tickets is a leaf node
--     from the cascade perspective.
--
--   - The tickets_session_ai_generated_consistent CHECK constraint
--     (migration 002) is evaluated on INSERT and UPDATE only — it does
--     not fire on DELETE and cannot block or corrupt a delete.
--
--   - tickets.session_id is ON DELETE SET NULL (pointing up to
--     processing_sessions). A ticket delete does not touch its parent
--     session; the parent session remains intact.
--
--   - RLS policy tickets_delete_admin (schema.sql) already restricts
--     DELETE to admin role. No additional RLS change is needed.
--
-- Why a migration is warranted
-- -----------------------------
-- The expected production delete query shape is firm-scoped:
--
--   DELETE FROM public.tickets
--   WHERE status = 'discarded'
--     AND firm_id = $1;
--
-- With the existing indexes the planner must choose between:
--   - idx_tickets_status   (status equality, then filter firm_id)
--   - idx_tickets_firm_id  (firm_id equality, then filter status)
--
-- Neither is a tight match: both require a filter step after the
-- index lookup. A partial composite index predicated on
-- status = 'discarded' eliminates ambiguity: it is small (covers only
-- discarded rows), ordered by firm_id for equality lookup, and ordered
-- by created_at DESC so a future "delete tickets discarded before date X"
-- range predicate is also served without a new index.
--
-- Write overhead: minimal. Inserts and status transitions to 'discarded'
-- are low-frequency relative to the main ticket write path (drafts and
-- approvals). The index maintenance cost per relevant write is negligible.
--
-- Idempotency: index uses IF NOT EXISTS. Safe to re-run.
-- Rollback: DOWN migration block is provided at the bottom of this file.
-- ============================================================

BEGIN;

-- ============================================================
-- FIX 01 (LOW) — partial composite index for discarded-ticket deletes
-- ============================================================
-- Serves:
--   DELETE FROM public.tickets
--   WHERE status = 'discarded'
--     AND firm_id = $1;
--
--   DELETE FROM public.tickets
--   WHERE status = 'discarded'
--     AND firm_id = $1
--     AND created_at < $2;   -- future "older than N days" cleanup variant
--
-- Column order:
--   firm_id      — equality filter, highest cardinality reduction, first
--   created_at   — range / sort column for date-bounded cleanup, second
--   DESC          — most recent discarded tickets first (cleanup UX order)
--
-- The WHERE status = 'discarded' predicate keeps the index small and
-- makes the planner strongly prefer it over idx_tickets_firm_id or
-- idx_tickets_status for this specific query shape.
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_tickets_discarded_firm_created_at
  ON public.tickets(firm_id, created_at DESC)
  WHERE status = 'discarded';


COMMIT;


-- ============================================================
-- DOWN MIGRATION (rollback)
-- ============================================================
-- Run this block manually to reverse all changes in this file.
-- Execute as a standalone transaction — do NOT run it as part of
-- a normal deployment.
-- ============================================================

/*  ---- BEGIN DOWN MIGRATION (do not run automatically) ----

BEGIN;

-- Drop the discarded-ticket partial composite index (Fix 01)
DROP INDEX IF EXISTS public.idx_tickets_discarded_firm_created_at;

COMMIT;

---- END DOWN MIGRATION ---- */
