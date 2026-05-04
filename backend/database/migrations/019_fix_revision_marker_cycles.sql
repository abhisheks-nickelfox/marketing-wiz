-- Migration 019: Fix revision marker logs that have revision_cycle = 0
--
-- When the transitionTicket endpoint first added 'revision' marker logs,
-- the revision_cycle field was not yet included in the insert statement.
-- Those rows fell back to the column DEFAULT of 0, causing all revision
-- section headers to collapse into cycle 0 (Initial Work) on the member
-- and admin Time History views. Sections with no real time logs (like an
-- empty Revision 2) disappeared entirely.
--
-- Fix: For each ticket, number the revision markers in chronological order
-- and assign them the correct cycle (1, 2, 3, …). Only rows where
-- revision_cycle = 0 are touched — correctly-tagged markers are left alone.
--
-- NOTE: Do NOT wrap in BEGIN/COMMIT — Supabase SQL Editor does not support
-- explicit transaction blocks. Apply via Supabase SQL Editor.

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY ticket_id ORDER BY created_at) AS correct_cycle
  FROM time_logs
  WHERE log_type = 'revision'
    AND revision_cycle = 0
)
UPDATE time_logs
SET revision_cycle = ranked.correct_cycle
FROM ranked
WHERE time_logs.id = ranked.id;
