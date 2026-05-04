-- Migration 020: Add projects table and link tickets to projects
-- Do NOT wrap in BEGIN/COMMIT — Supabase SQL Editor does not support
-- explicit transaction blocks. Apply via Supabase SQL Editor.

CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique project name per firm
ALTER TABLE public.projects
  ADD CONSTRAINT projects_name_firm_unique UNIQUE (firm_id, name);

-- Add project_id to tickets (nullable — existing tickets are unaffected)
ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS project_id UUID
  REFERENCES public.projects(id) ON DELETE SET NULL;

-- Performance indexes
CREATE INDEX idx_projects_firm_id ON public.projects(firm_id);
CREATE INDEX idx_tickets_project_id ON public.tickets(project_id);

-- Auto-update trigger for projects.updated_at
-- Reuses update_updated_at() already defined in schema.sql
CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY projects_select ON public.projects
  FOR SELECT
  USING (public.current_user_role() IN ('admin', 'member'));

CREATE POLICY projects_insert_admin ON public.projects
  FOR INSERT
  WITH CHECK (public.current_user_role() = 'admin');

CREATE POLICY projects_update_admin ON public.projects
  FOR UPDATE
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

CREATE POLICY projects_delete_admin ON public.projects
  FOR DELETE
  USING (public.current_user_role() = 'admin');

GRANT SELECT ON public.projects TO authenticated;
