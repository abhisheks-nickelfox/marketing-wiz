-- ============================================================
-- Verification Script for Skills Table
-- 
-- Run this in Supabase SQL Editor to check if everything is set up correctly
-- ============================================================

-- Check 1: Verify table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'skills' 
ORDER BY ordinal_position;

-- Expected output should include:
-- id, name, category, created_at, description, color

-- Check 2: Verify RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'skills'
ORDER BY policyname;

-- Expected policies:
-- skills_delete_admin (DELETE)
-- skills_insert_admin (INSERT)
-- skills_select_all (SELECT)
-- skills_update_admin (UPDATE) ← This should exist now

-- Check 3: Test data - see existing skills with their descriptions
SELECT 
  id,
  name,
  category,
  description,
  color,
  created_at
FROM public.skills
ORDER BY created_at DESC
LIMIT 10;
