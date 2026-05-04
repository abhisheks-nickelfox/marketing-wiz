# Skills Description & Color Fix

## Problem
Skills created with descriptions show "No description available" because:
1. The `description` and `color` columns might not exist in the database
2. The skills table is missing an UPDATE policy for admins

## Solution

### Step 1: Apply Database Migration

Go to your **Supabase SQL Editor** and run this script:

```sql
-- Add description and color columns if they don't exist
ALTER TABLE public.skills
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS color TEXT;

-- Drop existing UPDATE policy if it exists (to avoid conflicts)
DROP POLICY IF EXISTS "skills_update_admin" ON public.skills;

-- Create UPDATE policy for admins
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
```

### Step 2: Verify the Fix

After running the migration, verify the table structure:

```sql
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'skills' 
ORDER BY ordinal_position;
```

You should see:
- `id` (uuid)
- `name` (text)
- `category` (text)
- `created_at` (timestamp with time zone)
- `description` (text) ← Should be here
- `color` (text) ← Should be here

### Step 3: Test

1. Restart your backend server
2. Go to Settings → Organization Info → Skills
3. Click "Add a skill"
4. Fill in:
   - Skill Type: "Test Skill"
   - Description: "This is a test description"
   - Select a color
5. Click "Create"
6. The skill should now show the description instead of "No description available"

## Files Changed

### Backend
- `backend/src/modules/skills/skills.service.ts` - Fixed indentation and null handling
- `backend/src/modules/skills/skills.controller.ts` - Pass full request body

### Frontend
- `frontend-new/src/pages/SettingsPage.tsx` - Fixed skill creation and display
- `frontend-new/src/lib/api.ts` - Added description and color to Skill interface
- `frontend-new/src/components/users/SkillBadge.tsx` - Support custom colors
- `frontend-new/src/pages/UsersPage.tsx` - Pass color to SkillBadge

### Database
- `database/migrations/040_skills_update_policy.sql` - New migration for UPDATE policy
- `database/migrations/APPLY_THIS_skills_fix.sql` - Complete fix script

## Notes

- The backend uses the service role key which bypasses RLS, but the UPDATE policy is needed for potential future direct client access
- Empty descriptions will be stored as NULL in the database
- Colors should be hex values (e.g., #7F56D9)
