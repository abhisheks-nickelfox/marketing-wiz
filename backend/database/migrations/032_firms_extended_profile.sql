-- ============================================================
-- Migration 032: Extended firm profile
--
-- Adds to firms:
--   description TEXT           — free-text about the firm (was absent;
--                                contact_name/contact_email existed in
--                                base schema.sql but were never migrated)
--   location TEXT              — city/region or full address string
--   website_url TEXT           — firm website
--   logo_url TEXT              — URL to firm logo (Supabase Storage or CDN)
--   contact_role TEXT          — title of the primary contact person
--   contact_phone TEXT         — phone for the primary contact
--   account_manager_id UUID    — FK → users(id), the internal team member
--                                managing this client relationship
--
-- Notes:
--   - contact_name and contact_email already exist from schema.sql.
--     This migration does not touch them.
--   - account_manager_id uses ON DELETE SET NULL: deleting a user does
--     not cascade-delete the firm, it simply orphans the relationship.
--   - All new columns are nullable — existing firm rows are unaffected.
--   - website_url and logo_url are stored as plain TEXT; URL validation
--     is enforced at the application layer, not the DB layer (keeps the
--     constraint simple and avoids regex maintenance).
--
-- Do NOT wrap in BEGIN/COMMIT — Supabase SQL Editor rejects explicit
-- transaction blocks. Apply via Supabase SQL Editor.
-- ============================================================

ALTER TABLE public.firms
  ADD COLUMN IF NOT EXISTS location           TEXT,
  ADD COLUMN IF NOT EXISTS website_url        TEXT,
  ADD COLUMN IF NOT EXISTS logo_url           TEXT,
  ADD COLUMN IF NOT EXISTS contact_role       TEXT,
  ADD COLUMN IF NOT EXISTS contact_phone      TEXT,
  ADD COLUMN IF NOT EXISTS account_manager_id UUID
    REFERENCES public.users(id) ON DELETE SET NULL;

-- Index the FK so lookups of "which firms does user X manage?" are fast
-- and so ON DELETE SET NULL cascade-update runs via index scan.
CREATE INDEX IF NOT EXISTS idx_firms_account_manager_id
  ON public.firms (account_manager_id)
  WHERE account_manager_id IS NOT NULL;


-- ============================================================
-- DOWN MIGRATION
-- ============================================================
/*

DROP INDEX IF EXISTS public.idx_firms_account_manager_id;

ALTER TABLE public.firms
  DROP COLUMN IF EXISTS account_manager_id,
  DROP COLUMN IF EXISTS contact_phone,
  DROP COLUMN IF EXISTS contact_role,
  DROP COLUMN IF EXISTS logo_url,
  DROP COLUMN IF EXISTS website_url,
  DROP COLUMN IF EXISTS location;

*/
