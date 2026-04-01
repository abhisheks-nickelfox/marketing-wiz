-- Migration 009: Make super_admin pass all existing admin RLS policies
--
-- current_user_role() is used in every RLS policy as: current_user_role() = 'admin'
-- Since super_admin's role is 'super_admin' that check always fails, blocking all data.
-- Updating the function to return 'admin' for super_admin means all existing policies
-- work for super_admin without touching any individual policy definition.

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT AS $$
  SELECT
    CASE WHEN role IN ('admin', 'super_admin') THEN 'admin' ELSE role END
  FROM public.users
  WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;
