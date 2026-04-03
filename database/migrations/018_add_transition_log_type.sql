-- Migration 018: Add 'transition' log_type for status audit trail
--
-- When an admin moves a ticket through the review pipeline
-- (resolved → internal_review → client_review → compliance_review → approved → closed,
--  or sends back to revisions from any review stage), a zero-hour 'transition'
-- log is inserted so both admin and member can see the full status history
-- inline in the Time History card.
--
-- The 'comment' field stores the target status value (e.g. 'internal_review')
-- so the UI can render the correct status badge and label.
--
-- NOTE: Do NOT wrap in BEGIN/COMMIT — Supabase SQL Editor does not support
-- explicit transaction blocks. Apply via Supabase SQL Editor.

ALTER TABLE time_logs DROP CONSTRAINT IF EXISTS time_logs_log_type_check;
ALTER TABLE time_logs ADD CONSTRAINT time_logs_log_type_check
  CHECK (log_type IN ('estimate', 'partial', 'final', 'revision', 'transition'));
