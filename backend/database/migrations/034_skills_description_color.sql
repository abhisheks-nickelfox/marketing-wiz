-- ============================================================
-- Migration 034: Skills — description and color
--
-- Adds to skills:
--   description TEXT   — optional human-readable description of what
--                        the skill covers; useful for onboarding tooltips
--   color       TEXT   — hex or CSS color string for UI badge rendering
--                        (e.g. '#7F56D9'); no format constraint — enforce
--                        at the application layer so the catalog can
--                        accommodate both hex and named colors.
--
-- Both columns are nullable: existing skills are unaffected and the
-- catalog can be enriched incrementally by admins.
--
-- Do NOT wrap in BEGIN/COMMIT — Supabase SQL Editor rejects explicit
-- transaction blocks. Apply via Supabase SQL Editor.
-- ============================================================

ALTER TABLE public.skills
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS color       TEXT;


-- ============================================================
-- DOWN MIGRATION
-- ============================================================
/*

ALTER TABLE public.skills
  DROP COLUMN IF EXISTS color,
  DROP COLUMN IF EXISTS description;

*/
