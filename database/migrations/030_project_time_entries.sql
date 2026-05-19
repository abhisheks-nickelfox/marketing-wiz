-- Migration 030: Add project-level time entries
-- Allows time entries to be logged directly on a project (not only on tasks).
-- Makes task_id nullable and adds project_id FK.
-- Constraint ensures at least one of task_id or project_id is always set.

-- 1. Make task_id nullable (was NOT NULL)
ALTER TABLE time_entries ALTER COLUMN task_id DROP NOT NULL;

-- 2. Add project_id FK — cascades when the project is deleted
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE CASCADE;

-- 3. At least one of task_id / project_id must be non-null
ALTER TABLE time_entries ADD CONSTRAINT time_entries_task_or_project
  CHECK (task_id IS NOT NULL OR project_id IS NOT NULL);

-- 4. Index for project-scoped queries
CREATE INDEX IF NOT EXISTS idx_time_entries_project_id ON time_entries(project_id);
