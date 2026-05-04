-- ============================================================
-- Migration 040: Add UPDATE policy for skills table
--
-- The skills table was missing an UPDATE policy, which prevented
-- admins from updating skill descriptions and colors.
--
-- Apply via Supabase SQL Editor.
-- Do NOT wrap in BEGIN/COMMIT — Supabase SQL Editor rejects explicit
-- transaction blocks.
-- ============================================================

CREATE POLICY "skills_update_admin"
  ON skills FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND role IN ('admin', 'project_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND role IN ('admin', 'project_manager')
    )
  );


-- ============================================================
-- DOWN MIGRATION
-- ============================================================
/*

DROP POLICY IF EXISTS "skills_update_admin" ON skills;

*/
