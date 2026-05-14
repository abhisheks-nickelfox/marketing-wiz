-- Migration 052: Add address field to firms
-- Adds a free-text address field (street, city, state, ZIP, etc.)
-- separate from the country/location field.
-- Do NOT wrap in BEGIN/COMMIT.

ALTER TABLE public.firms
  ADD COLUMN IF NOT EXISTS address TEXT;
