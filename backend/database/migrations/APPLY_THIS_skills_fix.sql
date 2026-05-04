-- ============================================================
-- Skills Table Fix - Complete Setup
-- 
-- This script ensures:
-- 1. description and color columns exist on skills table
-- 2. UPDATE policy exists for admins to modify skills
--
-- Run this in Supabase SQL Editor
-- ============================================================

-- Step 1: Add description and color columns if they don't exist
ALTER TABLE public.skills
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS color TEXT;

-- Step 2: Drop existing UPDATE policy if it exists (to avoid conflicts)
DROP POLICY IF EXISTS "skills_update_admin" ON public.skills;

-- Step 3: Create UPDATE policy for admins
CREATE POLICY "skills_update_admin"
  ON public.skills FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND role IN ('admin', 'project_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND role IN ('admin', 'project_manager')
    )
  );

-- Step 4: Verify the table structure
-- Run this separately to check:
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'skills' 
-- ORDER BY ordinal_position;
