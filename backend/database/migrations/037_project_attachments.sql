-- ============================================================
-- Migration 037: project_attachments
--
-- Stores file metadata for files attached to a project (briefs,
-- brand guidelines, contracts, etc.). The actual files live in
-- Supabase Storage; this table stores the metadata pointers.
--
-- uploaded_by is nullable: if the uploading user is deleted,
-- the attachment is retained (ON DELETE SET NULL) so project
-- files are not silently lost when team members leave.
--
-- file_type is a MIME type string (e.g. 'application/pdf',
-- 'image/png'). No CHECK constraint — MIME type space is large
-- and evolves. Validation belongs in the application layer.
--
-- Do NOT wrap in BEGIN/COMMIT — Supabase SQL Editor rejects explicit
-- transaction blocks. Apply via Supabase SQL Editor.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.project_attachments (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  file_url    TEXT        NOT NULL,
  file_name   TEXT        NOT NULL,
  file_size   INTEGER     NOT NULL CHECK (file_size > 0),   -- bytes
  file_type   TEXT,                                          -- MIME type
  uploaded_by UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Primary read pattern: all attachments for a project, newest first
CREATE INDEX IF NOT EXISTS idx_project_attachments_project_id
  ON public.project_attachments (project_id, created_at DESC);

-- Lookup attachments uploaded by a specific user
CREATE INDEX IF NOT EXISTS idx_project_attachments_uploaded_by
  ON public.project_attachments (uploaded_by)
  WHERE uploaded_by IS NOT NULL;

-- RLS
ALTER TABLE public.project_attachments ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can view project attachments
CREATE POLICY "project_attachments_select"
  ON public.project_attachments FOR SELECT
  USING (
    public.current_user_role() IN ('admin', 'member', 'project_manager')
  );

-- Admins and project managers can upload
CREATE POLICY "project_attachments_insert"
  ON public.project_attachments FOR INSERT
  WITH CHECK (
    public.current_user_role() IN ('admin', 'project_manager')
  );

-- Only admins can delete project attachments
CREATE POLICY "project_attachments_delete"
  ON public.project_attachments FOR DELETE
  USING (
    public.current_user_role() = 'admin'
  );

GRANT SELECT, INSERT ON public.project_attachments TO authenticated;


-- ============================================================
-- DOWN MIGRATION
-- ============================================================
/*

DROP TABLE IF EXISTS public.project_attachments;

*/
