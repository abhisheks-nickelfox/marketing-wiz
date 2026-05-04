-- ============================================================
-- Migration: 001_schema_fixes.sql
-- Date:      2026-03-28
-- Author:    MarketingWiz DB Engineering
-- ============================================================
-- Summary of changes (12 fixes, ordered critical → low):
--
--   FIX 01 (CRITICAL) v_team_workload — eliminate cross-join explosion
--                     caused by joining time_logs and tickets independently
--                     on the same user. Aggregates time_logs in a subquery
--                     before joining.
--
--   FIX 02 (HIGH)     v_firm_ticket_stats — exclude hours from discarded
--                     tickets. Moves time_logs aggregation to a filtered
--                     subquery so discarded-ticket hours are not counted.
--
--   FIX 03 (HIGH)     Missing indexes — six indexes covering FK columns,
--                     common filter columns, and a partial index on approved
--                     tickets for dashboard queries.
--
--   FIX 04 (HIGH)     tickets.ai_generated — wrong DEFAULT (false). Tickets
--                     created from AI processing sessions should default to
--                     true; only manually created tickets are false.
--
--   FIX 05 (HIGH)     transcripts.raw_transcript — backfill NULLs to empty
--                     string, then enforce NOT NULL with DEFAULT ''.
--
--   FIX 06 (MEDIUM)   firms.name — missing UNIQUE constraint. Duplicate firm
--                     names cause data integrity issues in the admin UI.
--
--   FIX 07 (MEDIUM)   users.updated_at — column missing entirely. Adds it,
--                     backfills from created_at, sets DEFAULT NOW(), and
--                     wires the existing update_updated_at() trigger.
--
--   FIX 08 (LOW)      prompts.updated_at — same pattern as users.updated_at.
--
--   FIX 09 (MEDIUM)   time_logs.comment — backfill NULLs to empty string,
--                     enforce NOT NULL with DEFAULT ''.
--
--   FIX 10 (MEDIUM)   tickets.description and tickets.change_note — backfill
--                     NULLs to empty string, enforce NOT NULL with DEFAULT ''.
--
--   FIX 11 (MEDIUM)   RLS: prompts_select policy — members should not be
--                     able to read prompt system_prompt text. Restrict SELECT
--                     to admins only.
--
--   FIX 12 (MEDIUM)   firms.contact_email — add format CHECK constraint.
--                     Allows NULL (contact email is optional) but rejects
--                     malformed strings that pass no-@ or no-dot tests.
--
-- Idempotency: every statement uses IF NOT EXISTS / IF EXISTS / CREATE OR
-- REPLACE / DO $$ blocks where plain DDL would error on re-run.
--
-- Rollback: a DOWN migration block is provided at the bottom of this file.
-- ============================================================

BEGIN;

-- ============================================================
-- FIX 01 (CRITICAL) — v_team_workload: fix cross-join explosion
-- ============================================================
-- Root cause: the original view joins BOTH tickets (on assignee_id)
-- AND time_logs (on user_id) directly to users. Because these are
-- independent one-to-many relationships, PostgreSQL produces the
-- Cartesian product of the two result sets per user before the
-- aggregation. A member with 5 tickets and 10 time_log rows sees
-- 50 rows entering the SUM, inflating hours by 5x.
--
-- Fix: pre-aggregate time_logs per user_id in a derived table
-- (tl_agg) so it is already one row per user before joining.
-- COALESCE on tl_agg.total_hours handles users with no logs.
-- total_hours is included in GROUP BY because it is a scalar
-- column from the derived table, not an aggregate of the outer query.
-- ============================================================

CREATE OR REPLACE VIEW public.v_team_workload AS
SELECT
  u.id                                                           AS user_id,
  u.name,
  u.email,
  COUNT(DISTINCT t.id)                                           AS total_assigned,
  COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'approved')     AS active_tickets,
  COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'resolved')     AS resolved_tickets,
  COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'draft')        AS draft_tickets,
  COALESCE(tl_agg.total_hours, 0)                               AS total_hours_logged
FROM public.users u
LEFT JOIN public.tickets t ON t.assignee_id = u.id
LEFT JOIN (
  SELECT user_id, SUM(hours) AS total_hours
  FROM public.time_logs
  GROUP BY user_id
) tl_agg ON tl_agg.user_id = u.id
WHERE u.role = 'member'
GROUP BY u.id, u.name, u.email, tl_agg.total_hours;

-- Re-grant after CREATE OR REPLACE (REPLACE resets privileges)
GRANT SELECT ON public.v_team_workload TO authenticated;


-- ============================================================
-- FIX 02 (HIGH) — v_firm_ticket_stats: exclude discarded-ticket hours
-- ============================================================
-- Root cause: the original view LEFT JOINs time_logs unconditionally.
-- Any hours logged against a ticket before it was discarded are
-- still counted, inflating total_hours_spent for the firm.
--
-- Fix: pre-aggregate time_logs joined through tickets with a WHERE
-- t.status != 'discarded' filter inside a derived table. Using a
-- subquery instead of a WHERE on the outer query preserves the LEFT
-- JOIN semantics (firms with zero non-discarded tickets still appear).
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
FROM public.firms f
LEFT JOIN public.tickets t ON t.firm_id = f.id
LEFT JOIN (
  -- Pre-aggregate hours per ticket, excluding discarded tickets
  SELECT tl.ticket_id, SUM(tl.hours) AS total_hours
  FROM public.time_logs tl
  JOIN public.tickets t2 ON t2.id = tl.ticket_id
  WHERE t2.status != 'discarded'
  GROUP BY tl.ticket_id
) tl_agg ON tl_agg.ticket_id = t.id
GROUP BY f.id, f.name, f.contact_name, f.contact_email, f.created_at;

-- Re-grant after CREATE OR REPLACE
GRANT SELECT ON public.v_firm_ticket_stats TO authenticated;


-- ============================================================
-- FIX 03 (HIGH) — Missing indexes
-- ============================================================
-- Rationale per index:
--
--   idx_transcripts_firm_id
--     transcripts.firm_id is a FK column and also the primary filter
--     when listing a firm's transcripts. Without this, every firm-scoped
--     query does a full seq-scan of transcripts.
--
--   idx_prompts_firm_id
--     prompts.firm_id is a FK column. Queries that load a firm's prompt
--     library hit this column. Also unindexed FK = slow cascades.
--
--   idx_processing_sessions_created_by
--     processing_sessions.created_by is a FK to users. Queries that
--     audit which admin ran which session filter on this column.
--
--   idx_tickets_session_id
--     tickets.session_id is a FK to processing_sessions. Loading all
--     tickets produced by a session (a core post-processing query) does
--     a full ticket scan without this index.
--
--   idx_tickets_approved_created_at
--     Partial index: the admin "approved tickets" feed is one of the
--     most frequent dashboard queries. Limiting the index to
--     status = 'approved' keeps it small and the planner will use it
--     over the broader idx_tickets_status for this specific filter.
--
--   idx_transcripts_archived_call_date
--     Composite covering the common "recent active transcripts" query
--     pattern: WHERE archived = false ORDER BY call_date DESC.
--     Column order: equality filter (archived) first, range/sort
--     (call_date DESC) second — matches index scan direction.
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_transcripts_firm_id
  ON public.transcripts(firm_id);

CREATE INDEX IF NOT EXISTS idx_prompts_firm_id
  ON public.prompts(firm_id);

CREATE INDEX IF NOT EXISTS idx_processing_sessions_created_by
  ON public.processing_sessions(created_by);

CREATE INDEX IF NOT EXISTS idx_tickets_session_id
  ON public.tickets(session_id);

-- Partial index: approved tickets ordered by creation date (admin feed)
CREATE INDEX IF NOT EXISTS idx_tickets_approved_created_at
  ON public.tickets(created_at ASC) WHERE status = 'approved';

-- Composite: archived filter + call_date sort (recent transcripts panel)
CREATE INDEX IF NOT EXISTS idx_transcripts_archived_call_date
  ON public.transcripts(archived, call_date DESC);


-- ============================================================
-- FIX 04 (HIGH) — tickets.ai_generated: correct DEFAULT to true
-- ============================================================
-- The column defaulted to false. Because the primary write path is
-- AI-generated tickets from processing sessions, the overwhelming
-- majority of rows should be true. Inserting AI-generated tickets
-- without explicitly passing ai_generated = true was silently
-- creating rows that appeared manually authored.
-- ============================================================

ALTER TABLE public.tickets ALTER COLUMN ai_generated SET DEFAULT true;


-- ============================================================
-- FIX 05 (HIGH) — transcripts.raw_transcript: enforce NOT NULL
-- ============================================================
-- Step 1: backfill any existing NULLs to empty string so the
--         NOT NULL constraint does not immediately fail.
-- Step 2: add NOT NULL constraint.
-- Step 3: set DEFAULT '' so new rows inserted without a value
--         never violate the constraint.
--
-- Note: on a large table, step 2 would be split into a separate
-- deployment (validate the constraint as NOT VALID first, then
-- VALIDATE CONSTRAINT in a later migration). For the current
-- dataset size this single-step approach is acceptable.
-- ============================================================

UPDATE public.transcripts
  SET raw_transcript = ''
  WHERE raw_transcript IS NULL;

ALTER TABLE public.transcripts
  ALTER COLUMN raw_transcript SET NOT NULL;

ALTER TABLE public.transcripts
  ALTER COLUMN raw_transcript SET DEFAULT '';


-- ============================================================
-- FIX 06 (MEDIUM) — firms.name: add UNIQUE constraint
-- ============================================================
-- Duplicate firm names cause ambiguous lookups in the admin UI
-- (dropdowns, search) and indicate a data entry error. The
-- constraint is added idempotently via a DO block because
-- PostgreSQL does not support ADD CONSTRAINT IF NOT EXISTS for
-- UNIQUE constraints (only for CHECK constraints in PG 9.4+).
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM   pg_constraint
    WHERE  conrelid = 'public.firms'::regclass
    AND    conname  = 'firms_name_unique'
  ) THEN
    ALTER TABLE public.firms
      ADD CONSTRAINT firms_name_unique UNIQUE (name);
  END IF;
END;
$$;


-- ============================================================
-- FIX 07 (MEDIUM) — users.updated_at: add missing audit column
-- ============================================================
-- The users table was created without updated_at, unlike tickets
-- which has it. Without this column there is no way to detect
-- stale Supabase auth sync or audit profile edits.
--
-- update_updated_at() already exists (defined in schema.sql for
-- the tickets trigger), so we reference it directly.
--
-- Step 1: add column as nullable (required — can't add NOT NULL
--         column with no default to a table that has existing rows).
-- Step 2: backfill from created_at (best available approximation).
-- Step 3: set DEFAULT NOW() for future rows.
-- Step 4: drop + recreate trigger idempotently.
-- ============================================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

UPDATE public.users
  SET updated_at = created_at
  WHERE updated_at IS NULL;

ALTER TABLE public.users
  ALTER COLUMN updated_at SET DEFAULT NOW();

-- Trigger: drop first so CREATE is idempotent on re-run
DROP TRIGGER IF EXISTS users_updated_at ON public.users;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================
-- FIX 08 (LOW) — prompts.updated_at: add missing audit column
-- ============================================================
-- Prompts are edited by admins (system_prompt text, is_active toggle)
-- but there is no updated_at to tell when a prompt was last modified.
-- Same pattern as Fix 07; update_updated_at() already exists.
-- ============================================================

ALTER TABLE public.prompts
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

UPDATE public.prompts
  SET updated_at = created_at
  WHERE updated_at IS NULL;

ALTER TABLE public.prompts
  ALTER COLUMN updated_at SET DEFAULT NOW();

DROP TRIGGER IF EXISTS prompts_updated_at ON public.prompts;

CREATE TRIGGER prompts_updated_at
  BEFORE UPDATE ON public.prompts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================
-- FIX 09 (MEDIUM) — time_logs.comment: enforce NOT NULL
-- ============================================================
-- An empty comment is semantically different from a missing one
-- in the audit log context. Enforcing NOT NULL with a default of ''
-- removes the ambiguity and prevents NULLs from breaking string
-- concatenation in reporting queries.
-- ============================================================

UPDATE public.time_logs
  SET comment = ''
  WHERE comment IS NULL;

ALTER TABLE public.time_logs
  ALTER COLUMN comment SET NOT NULL;

ALTER TABLE public.time_logs
  ALTER COLUMN comment SET DEFAULT '';


-- ============================================================
-- FIX 10 (MEDIUM) — tickets.description and change_note: NOT NULL
-- ============================================================
-- Both columns were nullable with no default. Application code was
-- already treating them as empty strings in the UI, so the DB
-- should reflect the same invariant. Backfill first, then constrain.
-- ============================================================

UPDATE public.tickets
  SET description = ''
  WHERE description IS NULL;

UPDATE public.tickets
  SET change_note = ''
  WHERE change_note IS NULL;

ALTER TABLE public.tickets
  ALTER COLUMN description SET NOT NULL;

ALTER TABLE public.tickets
  ALTER COLUMN description SET DEFAULT '';

ALTER TABLE public.tickets
  ALTER COLUMN change_note SET NOT NULL;

ALTER TABLE public.tickets
  ALTER COLUMN change_note SET DEFAULT '';


-- ============================================================
-- FIX 11 (MEDIUM) — RLS: restrict prompts SELECT to admins only
-- ============================================================
-- The original prompts_select policy allowed members to read all
-- prompt rows, including system_prompt text (which contains
-- proprietary AI instruction data and firm-specific logic).
-- Members have no UI surface that displays prompts; the policy
-- was overly permissive.
--
-- The four write policies (insert/update/delete) already restrict
-- to admin only. This fix brings SELECT into alignment.
-- ============================================================

DROP POLICY IF EXISTS prompts_select ON public.prompts;

CREATE POLICY prompts_select ON public.prompts
  FOR SELECT
  USING (public.current_user_role() = 'admin');


-- ============================================================
-- FIX 12 (MEDIUM) — firms.contact_email: add format CHECK constraint
-- ============================================================
-- contact_email is optional (NULL allowed — not all firms have a
-- primary contact on file), but when a value is present it must
-- look like an email address. The regex checks for:
--   - at least one non-whitespace, non-@ character before @
--   - at least one non-whitespace, non-@ character between @ and .
--   - at least one non-whitespace, non-@ character after the last .
-- This is intentionally permissive (no full RFC 5322 validation)
-- to avoid rejecting edge-case valid addresses.
--
-- The constraint is dropped before re-adding so the migration is
-- safe to re-run even if a previous partial run created it.
-- ============================================================

ALTER TABLE public.firms
  DROP CONSTRAINT IF EXISTS firms_contact_email_format;

ALTER TABLE public.firms
  ADD CONSTRAINT firms_contact_email_format
  CHECK (
    contact_email IS NULL
    OR contact_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  );


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

-- Restore v_team_workload to original (cross-join version)
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
GRANT SELECT ON public.v_team_workload TO authenticated;

-- Restore v_firm_ticket_stats to original (unfiltered hours)
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
  COALESCE(SUM(tl.hours), 0)                                    AS total_hours_spent
FROM public.firms f
LEFT JOIN public.tickets    t   ON t.firm_id    = f.id
LEFT JOIN public.time_logs  tl  ON tl.ticket_id = t.id
GROUP BY f.id, f.name, f.contact_name, f.contact_email, f.created_at;
GRANT SELECT ON public.v_firm_ticket_stats TO authenticated;

-- Drop new indexes (Fix 03)
DROP INDEX IF EXISTS public.idx_transcripts_firm_id;
DROP INDEX IF EXISTS public.idx_prompts_firm_id;
DROP INDEX IF EXISTS public.idx_processing_sessions_created_by;
DROP INDEX IF EXISTS public.idx_tickets_session_id;
DROP INDEX IF EXISTS public.idx_tickets_approved_created_at;
DROP INDEX IF EXISTS public.idx_transcripts_archived_call_date;

-- Revert ai_generated default (Fix 04)
ALTER TABLE public.tickets ALTER COLUMN ai_generated SET DEFAULT false;

-- Revert transcripts.raw_transcript (Fix 05)
-- WARNING: this removes NOT NULL — future NULLs will be permitted again
ALTER TABLE public.transcripts ALTER COLUMN raw_transcript DROP NOT NULL;
ALTER TABLE public.transcripts ALTER COLUMN raw_transcript DROP DEFAULT;

-- Drop firms UNIQUE constraint (Fix 06)
ALTER TABLE public.firms DROP CONSTRAINT IF EXISTS firms_name_unique;

-- Drop users.updated_at and its trigger (Fix 07)
DROP TRIGGER IF EXISTS users_updated_at ON public.users;
ALTER TABLE public.users DROP COLUMN IF EXISTS updated_at;

-- Drop prompts.updated_at and its trigger (Fix 08)
DROP TRIGGER IF EXISTS prompts_updated_at ON public.prompts;
ALTER TABLE public.prompts DROP COLUMN IF EXISTS updated_at;

-- Revert time_logs.comment (Fix 09)
-- WARNING: removes NOT NULL — NULLs will be permitted again
ALTER TABLE public.time_logs ALTER COLUMN comment DROP NOT NULL;
ALTER TABLE public.time_logs ALTER COLUMN comment DROP DEFAULT;

-- Revert tickets.description and change_note (Fix 10)
-- WARNING: removes NOT NULL — NULLs will be permitted again
ALTER TABLE public.tickets ALTER COLUMN description DROP NOT NULL;
ALTER TABLE public.tickets ALTER COLUMN description DROP DEFAULT;
ALTER TABLE public.tickets ALTER COLUMN change_note DROP NOT NULL;
ALTER TABLE public.tickets ALTER COLUMN change_note DROP DEFAULT;

-- Restore original prompts_select policy (Fix 11)
DROP POLICY IF EXISTS prompts_select ON public.prompts;
CREATE POLICY prompts_select ON public.prompts
  FOR SELECT
  USING (public.current_user_role() IN ('admin', 'member'));

-- Drop email format constraint (Fix 12)
ALTER TABLE public.firms DROP CONSTRAINT IF EXISTS firms_contact_email_format;

COMMIT;

---- END DOWN MIGRATION ---- */
