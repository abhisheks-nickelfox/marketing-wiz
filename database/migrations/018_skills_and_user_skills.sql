-- Migration 018: skills catalog, user_skills junction, member_role, user status
--
-- Apply via Supabase SQL Editor.
-- Do NOT wrap in BEGIN/COMMIT — Supabase SQL Editor rejects explicit transaction blocks.

-- ── 1. skills table ──────────────────────────────────────────────────────────
-- Stores the skills catalog. Each skill belongs to an optional category.

CREATE TABLE IF NOT EXISTS skills (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  category    TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT skills_name_unique UNIQUE (name)
);

-- ── 2. user_skills junction table ────────────────────────────────────────────
-- Many-to-many: one user can have many skills, one skill can belong to many users.

CREATE TABLE IF NOT EXISTS user_skills (
  user_id     UUID        NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
  skill_id    UUID        NOT NULL REFERENCES skills(id)  ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, skill_id)
);

CREATE INDEX IF NOT EXISTS idx_user_skills_user_id  ON user_skills(user_id);
CREATE INDEX IF NOT EXISTS idx_user_skills_skill_id ON user_skills(skill_id);

-- ── 3. users.member_role ─────────────────────────────────────────────────────
-- Free-text job title shown only when role = 'member' (e.g. "Frontend Developer").

ALTER TABLE users ADD COLUMN IF NOT EXISTS member_role TEXT;

-- ── 4. users.status ──────────────────────────────────────────────────────────
-- Tracks invitation / active / disabled state independently of Supabase Auth.

ALTER TABLE users ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'Active'
  CHECK (status IN ('Active', 'invited', 'Disabled'));

-- ── 5. RLS policies for skills ───────────────────────────────────────────────
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;

-- Backend uses service-role key (bypasses RLS) — these policies are for
-- potential future direct-client use.

CREATE POLICY "skills_select_all"
  ON skills FOR SELECT USING (true);

CREATE POLICY "skills_insert_admin"
  ON skills FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "skills_delete_admin"
  ON skills FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND role IN ('admin', 'super_admin')
    )
  );

-- ── 6. RLS policies for user_skills ─────────────────────────────────────────
ALTER TABLE user_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_skills_select_all"
  ON user_skills FOR SELECT USING (true);

CREATE POLICY "user_skills_modify_admin"
  ON user_skills FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND role IN ('admin', 'super_admin')
    )
  );
