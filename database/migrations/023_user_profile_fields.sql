-- Migration 023: Add first_name, last_name, phone_number to users table
-- Apply via Supabase SQL Editor (do NOT wrap in BEGIN/COMMIT)

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS first_name   TEXT,
  ADD COLUMN IF NOT EXISTS last_name    TEXT,
  ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- Back-fill existing rows: split name on first space into first/last
UPDATE users
SET
  first_name = CASE
    WHEN position(' ' IN name) > 0 THEN split_part(name, ' ', 1)
    ELSE name
  END,
  last_name  = CASE
    WHEN position(' ' IN name) > 0 THEN substring(name FROM position(' ' IN name) + 1)
    ELSE NULL
  END
WHERE first_name IS NULL;
