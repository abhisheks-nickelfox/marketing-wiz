-- ============================================================
-- Migration: 002_manual_tickets.sql
-- Date:      2026-03-28
-- Author:    MarketingWiz DB Engineering
-- ============================================================
-- Summary of changes:
--
--   FIX 01 (HIGH)   tickets: add CHECK constraint to enforce the
--                   invariant between session_id and ai_generated.
--                   After migration 001 the default for ai_generated
--                   is true, so manually created tickets (session_id
--                   IS NULL) must explicitly pass ai_generated = false.
--                   Without a constraint, omitting that field silently
--                   marks manual tickets as AI-generated.
--
--                   Invariant:
--                     session_id IS NULL  → ai_generated must be false
--                     session_id NOT NULL → ai_generated must be true
--
--   FIX 02 (MEDIUM) tickets: add partial index on (firm_id, created_at
--                   DESC) WHERE ai_generated = false to serve the
--                   "manually created tickets for a firm" list query,
--                   which will become a common dashboard filter now
--                   that manual creation is supported.
--
-- Context:
--   schema.sql confirmed:
--     - tickets.session_id is nullable (no NOT NULL) — OK for manual tickets
--     - tickets.assignee_id is nullable                — OK for manual tickets
--     - tickets.estimated_hours is nullable             — OK for manual tickets
--     - type CHECK: ('task','design','development','account_management')
--     - priority CHECK: ('low','normal','high','urgent'), DEFAULT 'normal'
--     - status CHECK: ('draft','approved','discarded','resolved'), DEFAULT 'draft'
--   migration 001 confirmed:
--     - tickets.ai_generated DEFAULT changed from false → true (Fix 04)
--     - tickets.description  NOT NULL, DEFAULT ''      (Fix 10)
--     - tickets.change_note  NOT NULL, DEFAULT ''      (Fix 10)
--
--   No other schema changes are required for manual ticket insertion.
--
-- Idempotency: constraint is dropped before re-adding; index uses
--              IF NOT EXISTS. Safe to re-run.
--
-- Rollback: DOWN migration block is provided at the bottom of this file.
-- ============================================================

BEGIN;


-- ============================================================
-- FIX 01 (HIGH) — tickets: enforce session_id ↔ ai_generated invariant
-- ============================================================
-- Without this constraint the following logically incoherent states
-- are silently accepted:
--
--   (session_id = NULL,  ai_generated = true)
--     → a ticket that claims to be AI-generated but has no session.
--       Origin is unknowable; the ai_raw_output that drove it is lost.
--
--   (session_id = <uuid>, ai_generated = false)
--     → a ticket linked to an AI session but marked as manual.
--       Reports that filter on ai_generated = false for billing or
--       audit purposes will miscount work that actually came from AI.
--
-- The constraint encodes the bijection:
--   session_id IS NULL     ↔   ai_generated = false   (manual)
--   session_id IS NOT NULL ↔   ai_generated = true    (AI-generated)
--
-- Implementation note: a table-level CHECK is used because the
-- invariant spans two columns. PostgreSQL evaluates it on every INSERT
-- and UPDATE, so it catches both new rows and edits that break the
-- invariant (e.g., nulling out session_id without flipping ai_generated).
--
-- The constraint is dropped first so the migration is idempotent on
-- re-run. ADD CONSTRAINT IF NOT EXISTS is not supported for CHECK
-- constraints in this PostgreSQL version without a DO block, so we use
-- explicit DROP + ADD instead.
-- ============================================================

ALTER TABLE public.tickets
  DROP CONSTRAINT IF EXISTS tickets_session_ai_generated_consistent;

ALTER TABLE public.tickets
  ADD CONSTRAINT tickets_session_ai_generated_consistent CHECK (
    (session_id IS NULL     AND ai_generated = false)
    OR
    (session_id IS NOT NULL AND ai_generated = true)
  );


-- ============================================================
-- FIX 02 (MEDIUM) — tickets: partial index for manual ticket queries
-- ============================================================
-- Query pattern being served:
--   SELECT * FROM public.tickets
--   WHERE firm_id = $1
--     AND ai_generated = false
--   ORDER BY created_at DESC;
--
-- Column order rationale:
--   firm_id      — equality filter, high cardinality reduction, goes first
--   created_at   — sort column for the result set, goes second
--   DESC          — matches the expected "most recent first" UI ordering
--
-- The WHERE ai_generated = false predicate in the partial index definition
-- keeps the index small (only manual tickets) and makes the planner prefer
-- it over the broader idx_tickets_firm_id for this specific query shape.
--
-- Write overhead: manual ticket creation will be a low-frequency path
-- relative to AI-generated tickets, so the additional index maintenance
-- cost per INSERT is negligible.
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_tickets_manual_firm_created_at
  ON public.tickets(firm_id, created_at DESC)
  WHERE ai_generated = false;


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

-- Drop the session_id ↔ ai_generated CHECK constraint (Fix 01)
ALTER TABLE public.tickets
  DROP CONSTRAINT IF EXISTS tickets_session_ai_generated_consistent;

-- Drop the manual tickets partial index (Fix 02)
DROP INDEX IF EXISTS public.idx_tickets_manual_firm_created_at;

COMMIT;

---- END DOWN MIGRATION ---- */
