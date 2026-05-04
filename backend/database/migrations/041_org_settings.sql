-- Migration 041: Organisation settings (logo)
-- Apply via Supabase SQL Editor. Do NOT wrap in BEGIN/COMMIT.

CREATE TABLE IF NOT EXISTS public.org_settings (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  logo_url    TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed one default row so GET always returns something
INSERT INTO public.org_settings (id) VALUES (gen_random_uuid())
  ON CONFLICT DO NOTHING;

-- Auto-update updated_at
DROP TRIGGER IF EXISTS trg_org_settings_updated_at ON public.org_settings;

CREATE OR REPLACE FUNCTION update_org_settings_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_org_settings_updated_at
  BEFORE UPDATE ON public.org_settings
  FOR EACH ROW EXECUTE FUNCTION update_org_settings_updated_at();

-- RLS (backend uses service-role key so bypasses this, but needed for potential direct-client use)
ALTER TABLE public.org_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_settings_select_all"   ON public.org_settings;
DROP POLICY IF EXISTS "org_settings_update_admin" ON public.org_settings;

CREATE POLICY "org_settings_select_all"
  ON public.org_settings FOR SELECT USING (true);

CREATE POLICY "org_settings_update_admin"
  ON public.org_settings FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Storage bucket for org logos (public, 2 MB, images only)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'org-logos',
  'org-logos',
  true,
  2097152,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- Anyone can read org logos (public bucket)
DROP POLICY IF EXISTS "org_logos_select_all" ON storage.objects;
CREATE POLICY "org_logos_select_all"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'org-logos');

-- Only service role writes (backend uses service-role key, bypasses RLS)
-- No INSERT/UPDATE policy needed for direct-client use since all writes go through backend
