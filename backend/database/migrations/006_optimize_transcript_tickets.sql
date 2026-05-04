-- ============================================================
-- Migration: 006_optimize_transcript_tickets.sql
-- Date:      2026-03-30
-- Author:    MarketingWiz DB Engineering
-- ============================================================
-- Summary of changes (8 fixes, ordered critical → low):
--
--   FIX 01 (HIGH)     transcripts.fetched_at — add TIMESTAMPTZ column
--                     to record when the Fireflies sync last touched
--                     each row. Backfill from created_at. The sync
--                     service (fireflies.service.ts) should populate
--                     this on every upsert.
--
--   FIX 02 (HIGH)     tickets.regeneration_count — add INTEGER column
--                     (DEFAULT 0) to track how many times a ticket has
--                     been AI-regenerated. Separate from `edited` which
--                     conflates manual edits and AI regenerations.
--
--   FIX 03 (HIGH)     tickets.last_regenerated_at — add TIMESTAMPTZ
--                     column to record the exact time of the most recent
--                     AI regeneration. `updated_at` is too noisy (it
--                     fires on assign, approve, estimate changes as well).
--
--   FIX 04 (HIGH)     processing_sessions.transcript_id — add index on
--                     this FK column. Currently unindexed; the planner
--                     must seq-scan processing_sessions to find all
--                     sessions for a transcript (reverse of the FK path
--                     used during regenerate and audit queries).
--
--   FIX 05 (HIGH)     processing_sessions.firm_id — add index on this
--                     FK column. Used in "all sessions for a firm" audit
--                     queries and ON DELETE CASCADE traversal.
--
--   FIX 06 (MEDIUM)   processing_sessions.prompt_id — add index on this
--                     FK column. Used when checking which sessions used a
--                     given prompt before disabling it (prompt_id has
--                     ON DELETE RESTRICT, so Postgres must verify no
--                     child rows exist on prompt delete — index makes
--                     that check an index scan instead of a seq-scan).
--
--   FIX 07 (MEDIUM)   tickets — composite partial index on
--                     (firm_id, created_at DESC) WHERE status = 'draft'
--                     to serve the primary admin draft-review query:
--                       SELECT ... FROM tickets
--                       WHERE firm_id = $1 AND status = 'draft'
--                       ORDER BY created_at DESC;
--                     Mirrors the pattern of existing
--                     idx_tickets_approved_created_at (migration 001)
--                     and idx_tickets_discarded_firm_created_at (003).
--
--   FIX 08 (MEDIUM)   transcripts — partial index on
--                     (fetched_at ASC) WHERE archived = false
--                     to serve the "oldest unarchived transcript since
--                     last sync" lookup that a future incremental sync
--                     strategy would use.
--
-- Affected query patterns (verified against current controllers):
--
--   transcripts.controller.ts / listTranscripts
--     WHERE archived = false ORDER BY call_date DESC
--     → covered by idx_transcripts_archived_call_date (001)
--     → fetched_at column (Fix 01) enables freshness checks
--
--   transcripts.controller.ts / syncTranscripts (fireflies.service)
--     SELECT id, fireflies_id ... IN (fireflies_ids)
--     → covered by UNIQUE idx on fireflies_id (implicit from schema UNIQUE)
--     → UPDATE ... SET fetched_at = NOW() now stamped per upsert (Fix 01)
--
--   tickets.controller.ts / regenerateTicketHandler
--     SELECT tickets.*, processing_sessions(transcript_id)
--     → tickets.session_id indexed (001); PS.id is PK — OK
--     → PS.transcript_id now indexed (Fix 04) for reverse direction
--     → regeneration_count / last_regenerated_at updated (Fix 02/03)
--
--   Admin firm-detail draft review
--     WHERE firm_id = $1 AND status = 'draft' ORDER BY created_at DESC
--     → new partial index (Fix 07) is a precise match
--
-- Processing session FK index coverage (complete after this migration):
--   transcript_id → Fix 04
--   firm_id       → Fix 05
--   prompt_id     → Fix 06
--   created_by    → already indexed (migration 001)
--
-- Idempotency:
--   ADD COLUMN IF NOT EXISTS for new columns.
--   CREATE INDEX IF NOT EXISTS for all new indexes.
--   CHECK constraint uses DROP IF EXISTS + ADD (PG lacks ADD IF NOT EXISTS
--   for CHECK constraints without a DO block).
--   Safe to re-run.
--
-- Rollback: DOWN migration block is provided at the bottom of this file.
--
-- NOTE: Do NOT wrap in BEGIN/COMMIT — Supabase SQL Editor does not
-- support explicit transaction blocks. Apply via Supabase SQL Editor.
-- ============================================================


-- ============================================================
-- FIX 01 (HIGH) — transcripts.fetched_at: track last Fireflies sync time
-- ============================================================
-- Without this column there is no reliable way to:
--   a) detect transcripts that are stale (fetched > N hours ago)
--   b) implement incremental sync that only re-fetches rows older than
--      a certain freshness threshold without scanning the full table
--   c) audit whether a sync run actually reached every transcript or
--      silently skipped rows due to API pagination / errors
--
-- The fireflies.service.ts upsert loop currently writes no timestamp.
-- After this migration the service should set fetched_at = NOW() on
-- every insert and update path. The backfill below uses created_at as a
-- conservative approximation for existing rows (they were fetched at
-- some point on or after that date).
--
-- Column is nullable: manual transcripts (fireflies_id = 'manual_*')
-- are never fetched from Fireflies so fetched_at should remain NULL
-- for them, which is semantically correct.
-- ============================================================

ALTER TABLE transcripts
  ADD COLUMN IF NOT EXISTS fetched_at TIMESTAMPTZ;

-- Backfill existing Fireflies-sourced rows only (exclude manual_ prefix)
UPDATE transcripts
  SET fetched_at = created_at
  WHERE fetched_at IS NULL
    AND fireflies_id NOT LIKE 'manual_%';

-- Note: manual transcripts intentionally left as NULL — no backfill.


-- ============================================================
-- FIX 02 (HIGH) — tickets.regeneration_count: track AI regen iterations
-- ============================================================
-- Current state: the `edited` boolean (migration 001, Fix 10) is set
-- to true by both manual edits (PATCH /api/tickets/:id) and AI
-- regenerations (POST /api/tickets/:id/regenerate). These two signals
-- are conflated with no way to distinguish them or count iterations.
--
-- regeneration_count is a monotonically incrementing counter. The
-- application layer should issue:
--   UPDATE tickets
--   SET regeneration_count = regeneration_count + 1,
--       last_regenerated_at = NOW(), ...
--   WHERE id = $1
-- on every call to the regenerate endpoint.
--
-- Business value:
--   - A ticket regenerated > 3 times signals poor prompt quality or
--     unclear transcript — useful for prompt tuning metrics.
--   - Auditors can distinguish "this draft was reviewed and approved
--     on first pass" from "this draft went through 5 regen cycles".
--   - Does not change the meaning of `edited` (which may still be true
--     for manual edits) — the two columns serve orthogonal purposes.
--
-- DEFAULT 0: all existing tickets have never been regenerated.
-- NOT NULL: a count of zero is always meaningful; NULL would be ambiguous.
-- CHECK >= 0: a negative regen count is a logic error.
-- ============================================================

ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS regeneration_count INTEGER NOT NULL DEFAULT 0;

-- Enforce non-negative count at the DB level
ALTER TABLE tickets
  DROP CONSTRAINT IF EXISTS tickets_regeneration_count_non_negative;

ALTER TABLE tickets
  ADD CONSTRAINT tickets_regeneration_count_non_negative
  CHECK (regeneration_count >= 0);


-- ============================================================
-- FIX 03 (HIGH) — tickets.last_regenerated_at: precise regen timestamp
-- ============================================================
-- updated_at fires on every write to the tickets row, including:
--   - status changes (draft → approved → resolved)
--   - assignee changes
--   - estimated_hours updates by members
--   - manual admin edits to title/description
--
-- None of those should be confused with an AI regeneration event.
-- last_regenerated_at is only set (by the application) when
-- POST /api/tickets/:id/regenerate succeeds, giving a clean signal
-- of "when was the AI last asked to rewrite this ticket".
--
-- Nullable: NULL means the ticket has never been regenerated (either
-- it is a manually created ticket or an AI-generated ticket that was
-- accepted on the first draft). This is the correct semantic.
--
-- No DEFAULT: intentionally left NULL for all existing rows — none of
-- them have a known regeneration time even if regenerations occurred
-- before this migration (the data was never recorded).
-- ============================================================

ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS last_regenerated_at TIMESTAMPTZ;


-- ============================================================
-- FIX 04 (HIGH) — processing_sessions.transcript_id: add missing FK index
-- ============================================================
-- Current state: no index exists on this column despite it being a FK
-- to transcripts(id) with ON DELETE CASCADE.
--
-- Impact:
--   1. The regenerate handler does:
--        SELECT tickets.*, processing_sessions(transcript_id)
--      The planner resolves the nested select via processing_sessions.id
--      (PK — already fast). But any query going the other direction —
--      "show me all sessions derived from transcript X" — requires a
--      full seq-scan of processing_sessions.
--
--   2. Cascade deletes: if a transcript is deleted, Postgres must find
--      all child processing_sessions rows. Without an index this is a
--      seq-scan of the sessions table regardless of size.
--
--   3. Future audit queries (e.g., "how many times was transcript X
--      processed?") all hit this column.
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_processing_sessions_transcript_id
  ON processing_sessions(transcript_id);


-- ============================================================
-- FIX 05 (HIGH) — processing_sessions.firm_id: add missing FK index
-- ============================================================
-- firm_id is a FK with ON DELETE CASCADE. Without an index:
--   - "List all sessions for firm X" is a full seq-scan.
--   - Deleting a firm cascades through processing_sessions via seq-scan.
--
-- In the current codebase the firm_id is present on processing_sessions
-- as a denormalization for direct firm-scoped session queries without
-- needing to join through transcripts. That denormalization is only
-- useful if the column is indexed.
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_processing_sessions_firm_id
  ON processing_sessions(firm_id);


-- ============================================================
-- FIX 06 (MEDIUM) — processing_sessions.prompt_id: add missing FK index
-- ============================================================
-- prompt_id has ON DELETE RESTRICT, meaning Postgres must verify that
-- no processing_sessions row references a prompt before allowing the
-- prompt to be deleted. Without an index that verification is a
-- seq-scan of processing_sessions on every prompt delete attempt.
--
-- Secondary benefit: any future "which sessions used prompt X?" audit
-- query is served by this index without a full table scan.
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_processing_sessions_prompt_id
  ON processing_sessions(prompt_id);


-- ============================================================
-- FIX 07 (MEDIUM) — tickets: composite partial index for draft review
-- ============================================================
-- Query pattern being served (Firm Detail page, admin draft queue):
--   SELECT * FROM tickets
--   WHERE firm_id = $1
--     AND status = 'draft'
--   ORDER BY created_at DESC;
--
-- Column order rationale:
--   firm_id      — equality filter, highest selectivity, first
--   created_at   — ORDER BY column for the result, second
--   DESC          — matches "most recently created drafts first" UI order
--
-- Why a new index rather than relying on idx_tickets_firm_id:
--   idx_tickets_firm_id (firm_id only) requires a filter step on status
--   after the index lookup, then a sort on created_at. For firms with
--   many tickets across multiple statuses this is wasteful. The partial
--   index covers only draft rows, so the index is small, tight, and
--   pre-sorted — the planner can return rows without a sort step.
--
-- Consistency with prior partial indexes:
--   migration 001: idx_tickets_approved_created_at (status = 'approved')
--   migration 003: idx_tickets_discarded_firm_created_at (status = 'discarded')
--   this fix:      idx_tickets_draft_firm_created_at (status = 'draft')
--
-- The 'resolved' status is intentionally not given a matching index —
-- resolved tickets are infrequently queried by firm in the current UI
-- and the overhead of another partial index is not justified yet.
--
-- Write overhead: inserts and status transitions to 'draft' are the most
-- frequent write path (every AI processing run starts tickets as draft).
-- The additional index maintenance is the highest-frequency of all partial
-- indexes. Acceptable tradeoff given the read benefit on the primary admin
-- workflow (reviewing drafts). Flag for review if write throughput becomes
-- a concern.
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_tickets_draft_firm_created_at
  ON tickets(firm_id, created_at DESC)
  WHERE status = 'draft';


-- ============================================================
-- FIX 08 (MEDIUM) — transcripts: partial index on fetched_at for sync freshness
-- ============================================================
-- Query pattern being served (incremental sync strategy):
--   SELECT id, fireflies_id FROM transcripts
--   WHERE archived = false
--     AND (fetched_at IS NULL OR fetched_at < NOW() - INTERVAL '1 hour')
--   ORDER BY fetched_at ASC NULLS FIRST;
--
-- The WHERE archived = false predicate keeps the index small (archived
-- transcripts never need re-syncing). fetched_at ASC ordering allows
-- the sync service to prioritize the stalest transcripts first.
--
-- NULLS FIRST: un-synced rows (fetched_at IS NULL) sort before any
-- timestamp, so newly inserted Fireflies transcripts that somehow slipped
-- through without a fetched_at are always picked up first.
--
-- This index only becomes used once the fireflies.service.ts is updated
-- to populate fetched_at on upsert (tracked in the backend, not in this
-- migration). Creating the index now is safe and zero-cost until then.
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_transcripts_fetched_at_active
  ON transcripts(fetched_at ASC NULLS FIRST)
  WHERE archived = false;


-- ============================================================
-- DOWN MIGRATION (rollback)
-- ============================================================
-- Run this block manually to reverse all changes in this file.
-- Do NOT run automatically — apply via Supabase SQL Editor as a
-- standalone block after confirming the up migration is being rolled back.
-- ============================================================

/*  ---- BEGIN DOWN MIGRATION (do not run automatically) ----

-- Drop Fix 08: sync freshness index
DROP INDEX IF EXISTS idx_transcripts_fetched_at_active;

-- Drop Fix 07: draft queue partial index
DROP INDEX IF EXISTS idx_tickets_draft_firm_created_at;

-- Drop Fix 06: processing_sessions.prompt_id index
DROP INDEX IF EXISTS idx_processing_sessions_prompt_id;

-- Drop Fix 05: processing_sessions.firm_id index
DROP INDEX IF EXISTS idx_processing_sessions_firm_id;

-- Drop Fix 04: processing_sessions.transcript_id index
DROP INDEX IF EXISTS idx_processing_sessions_transcript_id;

-- Drop Fix 03: last_regenerated_at column
-- WARNING: data loss — any recorded regeneration timestamps are permanently lost
ALTER TABLE tickets DROP COLUMN IF EXISTS last_regenerated_at;

-- Drop Fix 02: regeneration_count column and its constraint
-- WARNING: data loss — all regeneration counts are permanently lost
ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_regeneration_count_non_negative;
ALTER TABLE tickets DROP COLUMN IF EXISTS regeneration_count;

-- Drop Fix 01: fetched_at column
-- WARNING: data loss — all recorded sync timestamps are permanently lost
ALTER TABLE transcripts DROP COLUMN IF EXISTS fetched_at;

---- END DOWN MIGRATION ---- */
