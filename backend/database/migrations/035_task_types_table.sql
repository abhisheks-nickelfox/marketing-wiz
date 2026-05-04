-- ============================================================
-- Migration 035: task_types catalog + tickets.task_type_id FK
--
-- Replaces the hard-coded tickets.type CHECK constraint with a
-- lookup-table approach so admins can manage task type definitions
-- (name, description, color) without a schema change.
--
-- Existing type values from the CHECK constraint:
--   'task', 'design', 'development', 'account_management'
-- These are seeded as rows in task_types below.
--
-- tickets.type (TEXT with CHECK) is RETAINED for backward compatibility
-- with the legacy frontend and any existing queries. It is NOT removed
-- here. tickets.task_type_id is added as a nullable FK alongside it.
-- A future migration can drop tickets.type once all consumers have been
-- migrated to use task_type_id.
--
-- RISK: The two columns can diverge (task_type_id points to 'design'
-- while type = 'task'). Application writes should keep them in sync.
-- Consider adding a trigger if divergence becomes a problem in practice.
--
-- Do NOT wrap in BEGIN/COMMIT — Supabase SQL Editor rejects explicit
-- transaction blocks. Apply via Supabase SQL Editor.
-- ============================================================


-- ============================================================
-- 1. Create task_types catalog table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.task_types (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  description TEXT,
  color       TEXT,       -- hex or CSS color for UI badges
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT task_types_name_unique UNIQUE (name)
);

-- RLS
ALTER TABLE public.task_types ENABLE ROW LEVEL SECURITY;

-- Everyone can read the catalog (drives dropdowns in the UI)
CREATE POLICY "task_types_select_all"
  ON public.task_types FOR SELECT
  USING (true);

-- Only admins can modify the catalog
CREATE POLICY "task_types_insert_admin"
  ON public.task_types FOR INSERT
  WITH CHECK (public.current_user_role() = 'admin');

CREATE POLICY "task_types_update_admin"
  ON public.task_types FOR UPDATE
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

CREATE POLICY "task_types_delete_admin"
  ON public.task_types FOR DELETE
  USING (public.current_user_role() = 'admin');

GRANT SELECT ON public.task_types TO authenticated;


-- ============================================================
-- 2. Seed existing type values as catalog rows
-- ============================================================
INSERT INTO public.task_types (name, description, color) VALUES
  ('task',               'General task or to-do item',            '#6B7280'),
  ('design',             'UI/UX design or visual asset work',      '#8B5CF6'),
  ('development',        'Software development or engineering',    '#3B82F6'),
  ('account_management', 'Client communication or account admin',  '#F59E0B')
ON CONFLICT (name) DO NOTHING;


-- ============================================================
-- 3. Add task_type_id FK to tickets
-- ============================================================
ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS task_type_id UUID
    REFERENCES public.task_types(id) ON DELETE SET NULL;

-- Backfill task_type_id from the existing type column
UPDATE public.tickets t
SET task_type_id = tt.id
FROM public.task_types tt
WHERE tt.name = t.type
  AND t.task_type_id IS NULL;

-- Index the FK for joins and cascade-lookup performance
CREATE INDEX IF NOT EXISTS idx_tickets_task_type_id
  ON public.tickets (task_type_id)
  WHERE task_type_id IS NOT NULL;


-- ============================================================
-- DOWN MIGRATION
-- ============================================================
/*

DROP INDEX IF EXISTS public.idx_tickets_task_type_id;
ALTER TABLE public.tickets DROP COLUMN IF EXISTS task_type_id;

DROP POLICY IF EXISTS "task_types_delete_admin" ON public.task_types;
DROP POLICY IF EXISTS "task_types_update_admin" ON public.task_types;
DROP POLICY IF EXISTS "task_types_insert_admin" ON public.task_types;
DROP POLICY IF EXISTS "task_types_select_all"   ON public.task_types;

DROP TABLE IF EXISTS public.task_types;

*/
