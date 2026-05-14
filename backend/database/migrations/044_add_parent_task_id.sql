-- Migration 044: Add parent_task_id to tickets for sub-task support
--
-- Sub-tasks are full tickets linked to a parent via parent_task_id.
-- ON DELETE CASCADE ensures sub-tasks are removed when the parent is deleted.
-- The partial index keeps lookups fast while skipping the common NULL case.

ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS parent_task_id UUID REFERENCES tickets(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_tickets_parent_task_id
  ON tickets(parent_task_id)
  WHERE parent_task_id IS NOT NULL;
