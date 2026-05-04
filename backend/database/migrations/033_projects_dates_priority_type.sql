-- ============================================================
-- Migration 033: Projects — start/end dates, priority, type
--
-- Adds to projects:
--   start_date DATE      — planned project start (nullable; not all
--                          projects are formally date-scoped at creation)
--   end_date   DATE      — planned project end / deadline (nullable)
--   priority   TEXT      — project importance level; CHECK IN
--                          ('high', 'medium', 'low'); DEFAULT 'medium'
--   type       TEXT      — free-text or controlled vocabulary for
--                          project classification (e.g. 'retainer',
--                          'campaign', 'one-off'); no CHECK constraint
--                          here — the catalog is expected to evolve and
--                          is better enforced at the application layer.
--                          Add a CHECK or FK to a project_types table
--                          once the vocabulary stabilises.
--
-- Data integrity note:
--   end_date >= start_date is enforced via a CHECK constraint only when
--   both values are non-null. A project with just an end_date (no start)
--   or just a start_date is valid.
--
-- Do NOT wrap in BEGIN/COMMIT — Supabase SQL Editor rejects explicit
-- transaction blocks. Apply via Supabase SQL Editor.
-- ============================================================

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date   DATE,
  ADD COLUMN IF NOT EXISTS priority   TEXT NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('high', 'medium', 'low')),
  ADD COLUMN IF NOT EXISTS type       TEXT;

-- Enforce date ordering only when both are present
ALTER TABLE public.projects
  DROP CONSTRAINT IF EXISTS projects_dates_ordered;

ALTER TABLE public.projects
  ADD CONSTRAINT projects_dates_ordered
    CHECK (
      start_date IS NULL
      OR end_date IS NULL
      OR end_date >= start_date
    );

-- Index end_date for "projects ending soon" dashboard queries
CREATE INDEX IF NOT EXISTS idx_projects_end_date
  ON public.projects (end_date)
  WHERE end_date IS NOT NULL AND status = 'active';

-- Index priority for filtered project lists
CREATE INDEX IF NOT EXISTS idx_projects_priority
  ON public.projects (firm_id, priority)
  WHERE status = 'active';


-- ============================================================
-- DOWN MIGRATION
-- ============================================================
/*

DROP INDEX IF EXISTS public.idx_projects_end_date;
DROP INDEX IF EXISTS public.idx_projects_priority;

ALTER TABLE public.projects
  DROP CONSTRAINT IF EXISTS projects_dates_ordered,
  DROP COLUMN IF EXISTS type,
  DROP COLUMN IF EXISTS priority,
  DROP COLUMN IF EXISTS end_date,
  DROP COLUMN IF EXISTS start_date;

*/
