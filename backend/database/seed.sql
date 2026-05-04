-- ============================================================
-- MarketingWiz Seed Data
-- ============================================================
-- NOTE: Run schema.sql first before running this file.
--
-- HOW TO CREATE THE FIRST ADMIN USER:
-- 1. Go to your Supabase project dashboard.
-- 2. Navigate to Authentication > Users > "Invite user" or "Add user".
-- 3. Create the user with their email and a temporary password.
-- 4. Copy the UUID of the newly created user from the Users table.
-- 5. Insert a row into public.users manually (via SQL Editor):
--
--    INSERT INTO public.users (id, email, name, role)
--    VALUES (
--      '<paste-uuid-here>',
--      'admin@example.com',
--      'Admin User',
--      'admin'
--    );
--
-- 6. The user can then log in and reset their password via the app.
-- ============================================================

-- ----------------------------------------------------------------
-- Sample Prompts
-- ----------------------------------------------------------------

INSERT INTO public.prompts (id, name, type, system_prompt, is_active, firm_id)
VALUES
  (
    gen_random_uuid(),
    'Project Management Debrief',
    'pm',
    'You are a senior project manager assistant. Your task is to analyze a client call transcript and extract actionable project management items. For each identified action item, produce a structured ticket with: a clear title, a detailed description, ticket type (task/design/development/account_management), a suggested priority (low/normal/high/urgent), and an estimated hours to complete. Focus on deliverables, deadlines, blockers, and follow-ups discussed in the call. Return your output as a JSON array of ticket objects.',
    true,
    NULL
  ),
  (
    gen_random_uuid(),
    'Campaign Planning Extractor',
    'campaigns',
    'You are a marketing campaign strategist assistant. Analyze the provided call transcript and identify all campaign-related discussion points. For each campaign initiative or task mentioned, generate a structured ticket including: title, description, ticket type, priority, and estimated hours. Pay particular attention to campaign goals, target audiences, channels, timelines, creative requirements, and budget discussions. Return your output as a JSON array of ticket objects.',
    true,
    NULL
  ),
  (
    gen_random_uuid(),
    'Content Production Tracker',
    'content',
    'You are a content production coordinator assistant. Review the call transcript and extract all content creation tasks and requirements discussed. For each content item identified, produce a structured ticket with: title, description, ticket type, priority, and estimated hours. Focus on content formats (blog posts, social media, email, video, etc.), deadlines, brand guidelines, approval workflows, and distribution plans. Return your output as a JSON array of ticket objects.',
    true,
    NULL
  );

-- ----------------------------------------------------------------
-- Sample Firms
-- ----------------------------------------------------------------

INSERT INTO public.firms (id, name, contact_name, contact_email, default_prompt_id)
VALUES
  (
    gen_random_uuid(),
    'Acme Marketing Co.',
    'Jane Smith',
    'jane.smith@acmemarketing.com',
    NULL  -- Update this with a prompt id after inserting prompts if needed
  ),
  (
    gen_random_uuid(),
    'Bright Horizon Agency',
    'Carlos Rivera',
    'c.rivera@brighthorizon.agency',
    NULL  -- Update this with a prompt id after inserting prompts if needed
  );

-- ----------------------------------------------------------------
-- Optional: Assign a default prompt to firms
-- Run the following after confirming prompt IDs:
--
-- UPDATE public.firms
-- SET default_prompt_id = (
--   SELECT id FROM public.prompts WHERE type = 'pm' AND firm_id IS NULL LIMIT 1
-- )
-- WHERE name = 'Acme Marketing Co.';
--
-- UPDATE public.firms
-- SET default_prompt_id = (
--   SELECT id FROM public.prompts WHERE type = 'campaigns' AND firm_id IS NULL LIMIT 1
-- )
-- WHERE name = 'Bright Horizon Agency';
-- ----------------------------------------------------------------
