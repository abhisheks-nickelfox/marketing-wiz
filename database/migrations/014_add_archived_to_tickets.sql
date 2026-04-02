-- Migration 014: Add archived flag to tickets
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_tickets_archived ON tickets(archived) WHERE archived = TRUE;
