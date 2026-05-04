-- ============================================================
-- Migration 031: Add project_manager to users.role CHECK
--
-- Extends the role enum from 3 values to 4:
--   admin, member, super_admin  →  admin, member, super_admin, project_manager
--
-- project_manager sits between admin and member:
--   - Can manage projects and project members (enforced in project_members RLS)
--   - Cannot perform super_admin-only operations (e.g. delete users)
--   - Backend middleware should treat project_manager as a distinct role
--     that has access to project-scoped admin actions
--
-- NOTE: current_user_role() returns the raw role value, so any RLS
-- policy that checks role IN ('admin', 'member') must be reviewed
-- to determine whether project_manager should be included.
-- The policies on firms, prompts, processing_sessions intentionally
-- restrict project_manager to read-only (same as member) unless
-- a separate UPDATE is made.
--
-- Do NOT wrap in BEGIN/COMMIT — Supabase SQL Editor rejects explicit
-- transaction blocks. Apply via Supabase SQL Editor.
-- ============================================================

ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE public.users
  ADD CONSTRAINT users_role_check
    CHECK (role IN ('admin', 'member', 'super_admin', 'project_manager'));


-- ============================================================
-- Update v_team_workload to include project_manager in the workload view
-- (already done in migration 030 — this is a no-op if 030 ran first,
--  but safe to apply standalone as well)
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
-- Update current_user_role() to normalize super_admin and project_manager
-- so existing RLS policies that check for 'admin' still work correctly
-- for super_admin, and policies written for 'member' still cover
-- project_manager where appropriate.
--
-- DESIGN DECISION: current_user_role() returns the raw role value.
-- This gives RLS policies full control over which roles get access.
-- We do NOT collapse project_manager → 'member' here because
-- project_members INSERT/DELETE policies explicitly grant project_manager
-- elevated access. Collapsing would break those policies.
-- ============================================================
-- No change needed to current_user_role() — it already returns raw role.


-- ============================================================
-- DOWN MIGRATION
-- ============================================================
/*

-- Revert project_manager users to member before dropping the constraint
UPDATE public.users SET role = 'member' WHERE role = 'project_manager';

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin', 'member', 'super_admin'));

*/
