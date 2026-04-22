-- Migration 026: Add workflow_status to projects + create project_members table

-- 1. Add workflow_status column to projects
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS workflow_status TEXT NOT NULL DEFAULT 'todo'
    CHECK (workflow_status IN ('todo', 'in_progress', 'in_review', 'approved', 'completed'));

-- 2. Create project_members junction table
CREATE TABLE IF NOT EXISTS project_members (
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  added_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (project_id, user_id)
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user_id    ON project_members(user_id);

-- 4. RLS
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "project_members_select" ON project_members
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "project_members_insert" ON project_members
  FOR INSERT TO authenticated
  WITH CHECK (current_user_role() IN ('admin', 'super_admin', 'project_manager'));

CREATE POLICY "project_members_delete" ON project_members
  FOR DELETE TO authenticated
  USING (current_user_role() IN ('admin', 'super_admin', 'project_manager'));
