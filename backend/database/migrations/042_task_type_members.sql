-- ============================================================
-- Migration 042: task_type_members junction table
--
-- Adds a many-to-many relationship between task_types and users
-- so each task type can have a "default team" of assigned members.
--
-- Apply via Supabase SQL Editor. Do NOT wrap in BEGIN/COMMIT.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.task_type_members (
  task_type_id UUID NOT NULL REFERENCES public.task_types(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES public.users(id)       ON DELETE CASCADE,
  added_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (task_type_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_task_type_members_user_id
  ON public.task_type_members (user_id);

ALTER TABLE public.task_type_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "task_type_members_select_all"
  ON public.task_type_members FOR SELECT
  USING (true);

CREATE POLICY "task_type_members_admin"
  ON public.task_type_members FOR ALL
  USING (public.current_user_role() = 'admin');

GRANT SELECT ON public.task_type_members TO authenticated;
