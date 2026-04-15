-- Migration 024: Add avatar_url to users table + create avatars storage bucket
-- Apply via Supabase SQL Editor (do NOT wrap in BEGIN/COMMIT)

-- 1. Add avatar_url column
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2. Create avatars storage bucket (public, 2MB limit)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage RLS — anyone can read avatars (public), only service role can write
CREATE POLICY "Public avatar read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');
