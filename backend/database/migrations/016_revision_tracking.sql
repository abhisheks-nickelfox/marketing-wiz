-- Migration 016: Revision cycle tracking on time_logs and tickets

-- Track which revision cycle each log belongs to (0 = initial work)
ALTER TABLE time_logs ADD COLUMN IF NOT EXISTS revision_cycle INTEGER NOT NULL DEFAULT 0;

-- Track the current revision cycle number on the ticket
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS revision_count INTEGER NOT NULL DEFAULT 0;

-- Expand log_type CHECK constraint to include 'revision' milestone markers
ALTER TABLE time_logs DROP CONSTRAINT IF EXISTS time_logs_log_type_check;
ALTER TABLE time_logs ADD CONSTRAINT time_logs_log_type_check
  CHECK (log_type IN ('estimate', 'partial', 'final', 'revision'));
