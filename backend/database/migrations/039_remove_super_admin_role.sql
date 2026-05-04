-- ============================================================
-- Migration 039: Remove super_admin role — merge all privileges into admin
--
-- super_admin is eliminated. All existing super_admin users become admin.
-- Roles after this migration: admin, member, project_manager
--
-- WHAT CHANGES:
--   1. Existing super_admin rows in users table → admin
--   2. users_role_check constraint updated to remove super_admin
--   3. current_user_role() function simplified (no longer needs super_admin → admin mapping)
--   4. v_team_workload view updated (admin excluded, only member + project_manager shown)
--
-- Do NOT wrap in BEGIN/COMMIT — Supabase SQL Editor rejects explicit
-- transaction blocks. Apply via Supabase SQL Editor.
-- ============================================================


-- ============================================================
-- STEP 1: Migrate existing super_admin users to admin
-- ============================================================
UPDATE public.users
  SET role = 'admin'
  WHERE role = 'super_admin';


-- ============================================================
-- STEP 2: Drop and recreate the role CHECK constraint
-- ============================================================
ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE public.users
  ADD CONSTRAINT users_role_check
    CHECK (role IN ('admin', 'member', 'project_manager'));


-- ============================================================
-- STEP 3: Update current_user_role() — remove super_admin branch
-- The function previously normalised super_admin → admin for RLS.
-- With super_admin gone the CASE is no longer needed; return role directly.
-- ============================================================
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$;


-- ============================================================
-- STEP 4: Rebuild v_team_workload — admin was never in the view;
-- only member + project_manager appear in team workload.
-- This is a no-op change in terms of logic but rebuilds cleanly
-- without the super_admin reference in any comments.
-- ============================================================
CREATE OR REPLACE VIEW public.v_team_workload AS
SELECT
  u.id                                                                        AS user_id,
  u.name,
  u.email,
  COUNT(DISTINCT t.id)                                                        AS total_assigned,
  COUNT(DISTINCT t.id) FILTER (
    WHERE t.status IN ('assigned', 'in_progress', 'revisions')
  )                                                                           AS active_tickets,
  COUNT(DISTINCT t.id) FILTER (
    WHERE t.status = 'completed'
  )                                                                           AS resolved_tickets,
  COUNT(DISTINCT t.id) FILTER (
    WHERE t.status = 'to_do'
  )                                                                           AS draft_tickets,
  COALESCE(tl_agg.total_hours, 0)                                            AS total_hours_logged
FROM public.users u
LEFT JOIN public.tickets t ON t.assignee_id = u.id AND t.archived = FALSE
LEFT JOIN (
  SELECT
    user_id,
    SUM(hours) AS total_hours
  FROM public.time_logs
  WHERE log_type NOT IN ('final', 'revision', 'transition')
  GROUP BY user_id
) tl_agg ON tl_agg.user_id = u.id
WHERE u.role IN ('member', 'project_manager')
GROUP BY u.id, u.name, u.email, tl_agg.total_hours;

GRANT SELECT ON public.v_team_workload TO authenticated;


-- ============================================================
-- STEP 5: Patch live RLS policies from migrations 018 + 019
-- that hard-coded role IN ('admin', 'super_admin').
-- Each block is guarded so this step is safe to run whether or
-- not migrations 018/019 have been applied yet.
-- ============================================================

DO $$
BEGIN
  -- skills (created by migration 018)
  IF EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'skills'
  ) THEN
    DROP POLICY IF EXISTS "skills_insert_admin" ON public.skills;
    DROP POLICY IF EXISTS "skills_delete_admin"  ON public.skills;

    EXECUTE $p$
      CREATE POLICY "skills_insert_admin"
        ON public.skills FOR INSERT
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
          )
        )
    $p$;

    EXECUTE $p$
      CREATE POLICY "skills_delete_admin"
        ON public.skills FOR DELETE
        USING (
          EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
          )
        )
    $p$;
  END IF;

  -- user_skills (created by migration 018)
  IF EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'user_skills'
  ) THEN
    DROP POLICY IF EXISTS "user_skills_modify_admin" ON public.user_skills;

    EXECUTE $p$
      CREATE POLICY "user_skills_modify_admin"
        ON public.user_skills FOR ALL
        USING (
          EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
          )
        )
    $p$;
  END IF;

  -- member_roles (created by migration 019)
  IF EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'member_roles'
  ) THEN
    DROP POLICY IF EXISTS "member_roles_insert_admin" ON public.member_roles;
    DROP POLICY IF EXISTS "member_roles_delete_admin" ON public.member_roles;

    EXECUTE $p$
      CREATE POLICY "member_roles_insert_admin"
        ON public.member_roles FOR INSERT
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
          )
        )
    $p$;

    EXECUTE $p$
      CREATE POLICY "member_roles_delete_admin"
        ON public.member_roles FOR DELETE
        USING (
          EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
          )
        )
    $p$;
  END IF;
END $$;


-- ============================================================
-- DOWN MIGRATION (manual rollback only)
-- ============================================================
/*

-- Restore role constraint to include super_admin
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin', 'member', 'super_admin', 'project_manager'));

-- Restore current_user_role() with super_admin normalisation
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT CASE WHEN role IN ('admin', 'super_admin') THEN 'admin' ELSE role END
  FROM public.users WHERE id = auth.uid();
$$;

-- NOTE: cannot automatically restore which admins were originally super_admins.

*/
