-- Migration 019: member_roles catalog
--
-- Apply via Supabase SQL Editor.
-- Do NOT wrap in BEGIN/COMMIT.

CREATE TABLE IF NOT EXISTS member_roles (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT member_roles_name_unique UNIQUE (name)
);

-- Seed common roles so the picker isn't empty on first run
INSERT INTO member_roles (name) VALUES
  ('Frontend Developer'),
  ('Backend Developer'),
  ('Fullstack Developer'),
  ('UX Designer'),
  ('Product Manager'),
  ('Content Writer'),
  ('Marketing Specialist'),
  ('Account Manager'),
  ('Project Manager'),
  ('Graphic Designer')
ON CONFLICT (name) DO NOTHING;

-- RLS
ALTER TABLE member_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "member_roles_select_all"
  ON member_roles FOR SELECT USING (true);

CREATE POLICY "member_roles_insert_admin"
  ON member_roles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "member_roles_delete_admin"
  ON member_roles FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND role IN ('admin', 'super_admin')
    )
  );
