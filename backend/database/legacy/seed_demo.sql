-- ============================================================
-- MarketingWiz Demo Seed Data
-- ============================================================
-- Run schema.sql FIRST, then this file.
--
-- HOW TO USE
-- ──────────
-- A) Local Supabase (supabase start / self-hosted):
--    Run this entire file in the SQL Editor or psql.
--    The auth.users block below is uncommented and will work.
--
-- B) Hosted Supabase (supabase.com cloud):
--    Option 1 — run database/seed_auth.js first (creates Auth
--               users via Admin API), then run this file.
--    Option 2 — create the 6 users manually in Dashboard →
--               Authentication → Users, copy each UUID, and
--               replace the UUIDs in this file before running.
--
-- Requires: pgcrypto extension (enabled by default in Supabase)
-- ============================================================

-- ============================================================
-- 0. AUTH USERS  (Supabase auth schema)
-- ============================================================
-- Required so that public.users FK constraint is satisfied.
-- Safe to re-run — uses ON CONFLICT DO NOTHING.

INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  invited_at,
  confirmation_token,
  confirmation_sent_at,
  recovery_token,
  recovery_sent_at,
  email_change_token_new,
  email_change,
  email_change_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  created_at,
  updated_at
) VALUES
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000001',
    'authenticated', 'authenticated',
    'admin@marketingwiz.io',
    crypt('Admin@1234', gen_salt('bf')),
    NOW() - INTERVAL '120 days',
    NULL, '', NULL, '', NULL, '', '', NULL,
    NOW() - INTERVAL '1 day',
    '{"provider":"email","providers":["email"]}', '{}',
    false,
    NOW() - INTERVAL '120 days', NOW()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000011',
    'authenticated', 'authenticated',
    's.chen@marketingwiz.io',
    crypt('Member@1234', gen_salt('bf')),
    NOW() - INTERVAL '90 days',
    NULL, '', NULL, '', NULL, '', '', NULL, NULL,
    '{"provider":"email","providers":["email"]}', '{}',
    false,
    NOW() - INTERVAL '90 days', NOW()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000012',
    'authenticated', 'authenticated',
    'm.thorne@marketingwiz.io',
    crypt('Member@1234', gen_salt('bf')),
    NOW() - INTERVAL '60 days',
    NULL, '', NULL, '', NULL, '', '', NULL, NULL,
    '{"provider":"email","providers":["email"]}', '{}',
    false,
    NOW() - INTERVAL '60 days', NOW()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000013',
    'authenticated', 'authenticated',
    'j.lee@marketingwiz.io',
    crypt('Member@1234', gen_salt('bf')),
    NOW() - INTERVAL '45 days',
    NULL, '', NULL, '', NULL, '', '', NULL, NULL,
    '{"provider":"email","providers":["email"]}', '{}',
    false,
    NOW() - INTERVAL '45 days', NOW()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000014',
    'authenticated', 'authenticated',
    'm.kapoor@marketingwiz.io',
    crypt('Member@1234', gen_salt('bf')),
    NOW() - INTERVAL '30 days',
    NULL, '', NULL, '', NULL, '', '', NULL, NULL,
    '{"provider":"email","providers":["email"]}', '{}',
    false,
    NOW() - INTERVAL '30 days', NOW()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000015',
    'authenticated', 'authenticated',
    't.harris@marketingwiz.io',
    crypt('Member@1234', gen_salt('bf')),
    NOW() - INTERVAL '15 days',
    NULL, '', NULL, '', NULL, '', '', NULL, NULL,
    '{"provider":"email","providers":["email"]}', '{}',
    false,
    NOW() - INTERVAL '15 days', NOW()
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 1. USERS (public profile table)
-- ============================================================

INSERT INTO public.users (id, email, name, role, created_at) VALUES
  ('00000000-0000-0000-0000-000000000001', 'admin@marketingwiz.io',    'Alex Rivers',    'admin',  NOW() - INTERVAL '120 days'),
  ('00000000-0000-0000-0000-000000000011', 's.chen@marketingwiz.io',   'Sarah Chen',     'member', NOW() - INTERVAL '90 days'),
  ('00000000-0000-0000-0000-000000000012', 'm.thorne@marketingwiz.io', 'Marcus Thorne',  'member', NOW() - INTERVAL '60 days'),
  ('00000000-0000-0000-0000-000000000013', 'j.lee@marketingwiz.io',    'Jordan Lee',     'member', NOW() - INTERVAL '45 days'),
  ('00000000-0000-0000-0000-000000000014', 'm.kapoor@marketingwiz.io', 'Maya Kapoor',    'member', NOW() - INTERVAL '30 days'),
  ('00000000-0000-0000-0000-000000000015', 't.harris@marketingwiz.io', 'Tom Harris',     'member', NOW() - INTERVAL '15 days')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 2. PROMPTS
-- ============================================================

INSERT INTO public.prompts (id, name, type, system_prompt, is_active, firm_id, created_at) VALUES
  (
    '00000000-0000-0000-0000-000000000021',
    'Project Management Debrief',
    'pm',
    'You are a senior project manager assistant. Analyze a client call transcript and extract actionable project management items. For each action item, produce a structured ticket with: title, description, type (task/design/development/account_management), priority (low/normal/high/urgent), and estimated_hours. Return a JSON array of ticket objects.',
    true, NULL,
    NOW() - INTERVAL '120 days'
  ),
  (
    '00000000-0000-0000-0000-000000000022',
    'Campaign Planning Extractor',
    'campaigns',
    'You are a marketing campaign strategist. Analyze the call transcript and identify all campaign-related discussion points. For each initiative generate a structured ticket with: title, description, type, priority, and estimated_hours. Focus on campaign goals, target audiences, channels, timelines, and creative requirements. Return a JSON array of ticket objects.',
    true, NULL,
    NOW() - INTERVAL '120 days'
  ),
  (
    '00000000-0000-0000-0000-000000000023',
    'Content Production Tracker',
    'content',
    'You are a content production coordinator. Review the call transcript and extract all content creation tasks. For each content item produce a structured ticket with: title, description, type, priority, and estimated_hours. Focus on content formats, deadlines, brand guidelines, and distribution plans. Return a JSON array of ticket objects.',
    true, NULL,
    NOW() - INTERVAL '120 days'
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 3. FIRMS
-- ============================================================

INSERT INTO public.firms (id, name, contact_name, contact_email, default_prompt_id, created_at) VALUES
  ('00000000-0000-0000-0000-000000000031', 'Acme Corp',        'Jane Smith',     'jane@acmecorp.com',        '00000000-0000-0000-0000-000000000021', NOW() - INTERVAL '110 days'),
  ('00000000-0000-0000-0000-000000000032', 'Globex Ltd',       'Carlos Rivera',  'c.rivera@globex.com',      '00000000-0000-0000-0000-000000000022', NOW() - INTERVAL '100 days'),
  ('00000000-0000-0000-0000-000000000033', 'Stark Ent',        'Tony Stark',     't.stark@starkent.com',     '00000000-0000-0000-0000-000000000021', NOW() - INTERVAL '95 days'),
  ('00000000-0000-0000-0000-000000000034', 'Nexus Digital',    'Priya Mehta',    'p.mehta@nexusdigital.io',  '00000000-0000-0000-0000-000000000022', NOW() - INTERVAL '80 days'),
  ('00000000-0000-0000-0000-000000000035', 'Lumina Tech',      'Chris Park',     'c.park@luminatech.com',    '00000000-0000-0000-0000-000000000023', NOW() - INTERVAL '70 days'),
  ('00000000-0000-0000-0000-000000000036', 'Evergreen Retail', 'Sam Greenfield', 's.green@evergreen.com',    '00000000-0000-0000-0000-000000000023', NOW() - INTERVAL '55 days')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 4. TRANSCRIPTS
-- ============================================================

INSERT INTO public.transcripts (id, fireflies_id, title, call_date, duration_sec, participants, firm_id, archived, created_at) VALUES
  (
    '00000000-0000-0000-0000-000000000041',
    'ff_wk_strategy_q4',
    'Weekly Strategy Sync - Q4 Planning',
    NOW() - INTERVAL '3 days',
    2712,
    '[{"name":"Alex Rivers","email":"admin@marketingwiz.io"},{"name":"Jane Smith","email":"jane@acmecorp.com"},{"name":"Sarah Chen","email":"s.chen@marketingwiz.io"},{"name":"Carlos Rivera","email":"c.rivera@globex.com"}]',
    '00000000-0000-0000-0000-000000000031',
    false,
    NOW() - INTERVAL '3 days'
  ),
  (
    '00000000-0000-0000-0000-000000000042',
    'ff_onboard_stellartech',
    'Client Onboarding: Stellar Tech',
    NOW() - INTERVAL '4 days',
    1965,
    '[{"name":"Alex Rivers","email":"admin@marketingwiz.io"},{"name":"Priya Mehta","email":"p.mehta@nexusdigital.io"},{"name":"Jordan Lee","email":"j.lee@marketingwiz.io"}]',
    '00000000-0000-0000-0000-000000000034',
    false,
    NOW() - INTERVAL '4 days'
  ),
  (
    '00000000-0000-0000-0000-000000000043',
    'ff_content_cal_nov',
    'Content Calendar Review - November',
    NOW() - INTERVAL '5 days',
    3484,
    '[{"name":"Alex Rivers","email":"admin@marketingwiz.io"},{"name":"Chris Park","email":"c.park@luminatech.com"},{"name":"Maya Kapoor","email":"m.kapoor@marketingwiz.io"},{"name":"Marcus Thorne","email":"m.thorne@marketingwiz.io"},{"name":"Tom Harris","email":"t.harris@marketingwiz.io"},{"name":"Sam Greenfield","email":"s.green@evergreen.com"}]',
    '00000000-0000-0000-0000-000000000035',
    false,
    NOW() - INTERVAL '5 days'
  ),
  (
    '00000000-0000-0000-0000-000000000044',
    'ff_budget_roi_q3',
    'Budget Allocation & ROI Analysis',
    NOW() - INTERVAL '7 days',
    4320,
    '[{"name":"Alex Rivers","email":"admin@marketingwiz.io"},{"name":"Tony Stark","email":"t.stark@starkent.com"},{"name":"Jordan Lee","email":"j.lee@marketingwiz.io"}]',
    '00000000-0000-0000-0000-000000000033',
    false,
    NOW() - INTERVAL '7 days'
  ),
  (
    '00000000-0000-0000-0000-000000000045',
    'ff_ad_creative_winter',
    'Ad Creative Brainstorm: Winter Sale',
    NOW() - INTERVAL '9 days',
    1458,
    '[{"name":"Alex Rivers","email":"admin@marketingwiz.io"},{"name":"Sam Greenfield","email":"s.green@evergreen.com"},{"name":"Maya Kapoor","email":"m.kapoor@marketingwiz.io"},{"name":"Marcus Thorne","email":"m.thorne@marketingwiz.io"},{"name":"Tom Harris","email":"t.harris@marketingwiz.io"}]',
    '00000000-0000-0000-0000-000000000036',
    false,
    NOW() - INTERVAL '9 days'
  ),
  (
    '00000000-0000-0000-0000-000000000046',
    'ff_seo_keyword_techblog',
    'SEO Keyword Research - Tech Blog',
    NOW() - INTERVAL '12 days',
    2515,
    '[{"name":"Alex Rivers","email":"admin@marketingwiz.io"},{"name":"Carlos Rivera","email":"c.rivera@globex.com"},{"name":"Tom Harris","email":"t.harris@marketingwiz.io"},{"name":"Jordan Lee","email":"j.lee@marketingwiz.io"}]',
    '00000000-0000-0000-0000-000000000032',
    false,
    NOW() - INTERVAL '12 days'
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 5. PROCESSING SESSIONS
-- ============================================================

INSERT INTO public.processing_sessions (id, transcript_id, firm_id, prompt_id, text_notes, created_by, created_at) VALUES
  (
    '00000000-0000-0000-0000-000000000051',
    '00000000-0000-0000-0000-000000000041',
    '00000000-0000-0000-0000-000000000031',
    '00000000-0000-0000-0000-000000000021',
    'Q4 strategy call — focus on content refresh and paid media.',
    '00000000-0000-0000-0000-000000000001',
    NOW() - INTERVAL '2 days'
  ),
  (
    '00000000-0000-0000-0000-000000000052',
    '00000000-0000-0000-0000-000000000043',
    '00000000-0000-0000-0000-000000000035',
    '00000000-0000-0000-0000-000000000023',
    'November content calendar — blog posts, social, email.',
    '00000000-0000-0000-0000-000000000001',
    NOW() - INTERVAL '4 days'
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 6. TICKETS
-- ============================================================

INSERT INTO public.tickets
  (id, session_id, firm_id, assignee_id, title, description, type, priority, status,
   estimated_hours, ai_generated, edited, created_at, updated_at)
VALUES

-- ── Acme Corp ──────────────────────────────────────────────
  (
    '00000000-0000-0000-0000-000000000061',
    '00000000-0000-0000-0000-000000000051',
    '00000000-0000-0000-0000-000000000031',
    '00000000-0000-0000-0000-000000000011',  -- Sarah Chen
    'Q4 Content Strategy Revamp',
    'Comprehensive review of all Q4 marketing assets. Identify content gaps and optimization opportunities. Deliverables: content inventory, gap analysis report, and prioritized list of high-impact updates.',
    'task', 'high', 'draft',
    24.00, true, false,
    NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'
  ),
  (
    '00000000-0000-0000-0000-000000000062',
    '00000000-0000-0000-0000-000000000051',
    '00000000-0000-0000-0000-000000000031',
    '00000000-0000-0000-0000-000000000013',  -- Jordan Lee
    'Homepage SEO Optimization',
    'Full on-page SEO audit and optimization for the Acme Corp homepage. Keyword mapping, meta tags, structured data, and internal linking improvements.',
    'development', 'high', 'approved',
    16.00, true, false,
    NOW() - INTERVAL '8 days', NOW() - INTERVAL '1 day'
  ),
  (
    '00000000-0000-0000-0000-000000000063',
    NULL,
    '00000000-0000-0000-0000-000000000031',
    '00000000-0000-0000-0000-000000000014',  -- Maya Kapoor
    'Bi-Weekly Newsletter Draft',
    'Create the next edition of the Acme Corp bi-weekly newsletter. Focus on Q4 product updates and holiday promotions.',
    'task', 'normal', 'draft',
    8.00, false, false,
    NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'
  ),
  (
    '00000000-0000-0000-0000-000000000064',
    NULL,
    '00000000-0000-0000-0000-000000000031',
    '00000000-0000-0000-0000-000000000012',  -- Marcus Thorne
    'Banner Asset Approvals for Q4 Campaign',
    'Collect final sign-off on all banner assets. Coordinate with design team and get client approval before campaign launch.',
    'account_management', 'urgent', 'approved',
    4.00, false, false,
    NOW() - INTERVAL '14 days', NOW() - INTERVAL '3 days'
  ),

-- ── Globex Ltd ─────────────────────────────────────────────
  (
    '00000000-0000-0000-0000-000000000065',
    NULL,
    '00000000-0000-0000-0000-000000000032',
    NULL,
    'Google Ads Performance Audit',
    'Full audit of Globex Google Ads account. Review campaign structure, keyword bids, quality scores, and conversion tracking. Recommend optimizations.',
    'task', 'normal', 'approved',
    12.00, false, false,
    NOW() - INTERVAL '10 days', NOW() - INTERVAL '2 days'
  ),
  (
    '00000000-0000-0000-0000-000000000066',
    NULL,
    '00000000-0000-0000-0000-000000000032',
    '00000000-0000-0000-0000-000000000015',  -- Tom Harris
    'SEO Keyword Research — Tech Blog',
    'Research and compile a master keyword list for the Globex technology blog. Target 50+ long-tail opportunities with monthly search volume data.',
    'task', 'high', 'approved',
    16.00, false, true,
    NOW() - INTERVAL '12 days', NOW() - INTERVAL '1 day'
  ),
  (
    '00000000-0000-0000-0000-000000000067',
    NULL,
    '00000000-0000-0000-0000-000000000032',
    '00000000-0000-0000-0000-000000000013',  -- Jordan Lee
    'Social Media Engagement Report',
    'Monthly social media performance report for Globex across LinkedIn, Twitter/X, and Instagram. Include engagement trends and competitor benchmarking.',
    'task', 'low', 'resolved',
    4.00, false, false,
    NOW() - INTERVAL '20 days', NOW() - INTERVAL '10 days'
  ),

-- ── Stark Ent ──────────────────────────────────────────────
  (
    '00000000-0000-0000-0000-000000000068',
    NULL,
    '00000000-0000-0000-0000-000000000033',
    '00000000-0000-0000-0000-000000000011',  -- Sarah Chen
    'API Connection Error — CRM',
    'Debug and resolve intermittent connection failures between Stark Ent CRM and the marketing automation platform. Root cause analysis and fix.',
    'development', 'urgent', 'resolved',
    4.00, false, false,
    NOW() - INTERVAL '15 days', NOW() - INTERVAL '7 days'
  ),
  (
    '00000000-0000-0000-0000-000000000069',
    NULL,
    '00000000-0000-0000-0000-000000000033',
    '00000000-0000-0000-0000-000000000012',  -- Marcus Thorne
    'Database Migration Delay Report',
    'Prepare stakeholder report on the Q3 database migration delay. Document causes, business impact, and remediation timeline.',
    'account_management', 'high', 'approved',
    6.00, false, false,
    NOW() - INTERVAL '18 days', NOW() - INTERVAL '4 days'
  ),
  (
    '00000000-0000-0000-0000-000000000070',
    NULL,
    '00000000-0000-0000-0000-000000000033',
    NULL,
    'Holiday Promo Landing Page',
    'Design and develop a holiday promotions landing page for Stark Ent. Includes hero section, product highlights, countdown timer, and CTA.',
    'design', 'urgent', 'approved',
    32.00, false, false,
    NOW() - INTERVAL '6 days', NOW() - INTERVAL '1 day'
  ),

-- ── Nexus Digital ──────────────────────────────────────────
  (
    '00000000-0000-0000-0000-000000000071',
    NULL,
    '00000000-0000-0000-0000-000000000034',
    '00000000-0000-0000-0000-000000000011',  -- Sarah Chen
    'Email Automation Setup',
    'Configure drip email sequence in HubSpot for Nexus Digital onboarding flow. 5-email sequence over 14 days with dynamic content personalization.',
    'development', 'high', 'approved',
    6.00, false, false,
    NOW() - INTERVAL '7 days', NOW() - INTERVAL '2 days'
  ),
  (
    '00000000-0000-0000-0000-000000000072',
    NULL,
    '00000000-0000-0000-0000-000000000034',
    '00000000-0000-0000-0000-000000000014',  -- Maya Kapoor
    'Q3 Campaign Report',
    'Comprehensive Q3 performance report for Nexus Digital campaigns across paid, organic, and email channels. Include attribution analysis.',
    'task', 'low', 'approved',
    4.00, false, false,
    NOW() - INTERVAL '9 days', NOW() - INTERVAL '3 days'
  ),
  (
    '00000000-0000-0000-0000-000000000073',
    NULL,
    '00000000-0000-0000-0000-000000000034',
    '00000000-0000-0000-0000-000000000013',  -- Jordan Lee
    'Facebook Pixel Audit',
    'Audit Nexus Digital Facebook Pixel implementation across all landing pages. Verify event tracking accuracy and fix any misfires.',
    'development', 'normal', 'draft',
    3.00, false, false,
    NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days'
  ),

-- ── Lumina Tech ────────────────────────────────────────────
  (
    '00000000-0000-0000-0000-000000000074',
    '00000000-0000-0000-0000-000000000052',
    '00000000-0000-0000-0000-000000000035',
    '00000000-0000-0000-0000-000000000011',  -- Sarah Chen
    'Q4 Meta Ad Strategy',
    'Develop full Meta advertising strategy for Lumina Tech Q4 push. Includes audience segmentation, creative brief, budget allocation, and A/B testing plan.',
    'task', 'urgent', 'approved',
    20.00, true, false,
    NOW() - INTERVAL '3 days', NOW() - INTERVAL '1 day'
  ),
  (
    '00000000-0000-0000-0000-000000000075',
    '00000000-0000-0000-0000-000000000052',
    '00000000-0000-0000-0000-000000000035',
    '00000000-0000-0000-0000-000000000015',  -- Tom Harris
    'Competitor SEO Audit',
    'Comprehensive competitor SEO analysis for Lumina Tech in the SaaS analytics space. Identify keyword gaps and backlink opportunities.',
    'task', 'normal', 'approved',
    12.00, true, false,
    NOW() - INTERVAL '5 days', NOW() - INTERVAL '2 days'
  ),

-- ── Evergreen Retail ───────────────────────────────────────
  (
    '00000000-0000-0000-0000-000000000076',
    NULL,
    '00000000-0000-0000-0000-000000000036',
    '00000000-0000-0000-0000-000000000014',  -- Maya Kapoor
    'Email Campaign Redesign',
    'Full redesign of Evergreen Retail email templates. Mobile-first approach, updated brand colors, improved CTA placement. Deliver 3 template variants.',
    'design', 'high', 'approved',
    18.00, false, false,
    NOW() - INTERVAL '6 days', NOW() - INTERVAL '2 days'
  ),
  (
    '00000000-0000-0000-0000-000000000077',
    NULL,
    '00000000-0000-0000-0000-000000000036',
    '00000000-0000-0000-0000-000000000013',  -- Jordan Lee
    'Zapier Integration Debug',
    'Diagnose and fix Zapier workflow failures between Evergreen Retail Shopify store and their email marketing platform.',
    'development', 'high', 'approved',
    1.50, false, false,
    NOW() - INTERVAL '3 days', NOW() - INTERVAL '1 day'
  ),
  (
    '00000000-0000-0000-0000-000000000078',
    NULL,
    '00000000-0000-0000-0000-000000000036',
    '00000000-0000-0000-0000-000000000012',  -- Marcus Thorne
    'LinkedIn Banner Package',
    'Design a set of LinkedIn banner assets for Evergreen Retail brand refresh. Include company page cover, personal profile banners for exec team.',
    'design', 'low', 'resolved',
    6.00, false, false,
    NOW() - INTERVAL '25 days', NOW() - INTERVAL '15 days'
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 7. TIME LOGS
-- ============================================================

INSERT INTO public.time_logs (id, ticket_id, user_id, hours, comment, log_type, created_at) VALUES
  -- Q4 Content Strategy (Sarah Chen)
  ('00000000-0000-0000-0000-000000000081', '00000000-0000-0000-0000-000000000061', '00000000-0000-0000-0000-000000000011', 3.00, 'Initial content inventory', 'partial', NOW() - INTERVAL '1 day'),
  ('00000000-0000-0000-0000-000000000082', '00000000-0000-0000-0000-000000000061', '00000000-0000-0000-0000-000000000011', 5.50, 'Gap analysis draft', 'partial', NOW() - INTERVAL '12 hours'),

  -- Homepage SEO (Jordan Lee)
  ('00000000-0000-0000-0000-000000000083', '00000000-0000-0000-0000-000000000062', '00000000-0000-0000-0000-000000000013', 4.00, 'Keyword research', 'partial', NOW() - INTERVAL '7 days'),
  ('00000000-0000-0000-0000-000000000084', '00000000-0000-0000-0000-000000000062', '00000000-0000-0000-0000-000000000013', 8.00, 'On-page optimization', 'partial', NOW() - INTERVAL '3 days'),

  -- Banner Asset Approvals (Marcus Thorne)
  ('00000000-0000-0000-0000-000000000085', '00000000-0000-0000-0000-000000000064', '00000000-0000-0000-0000-000000000012', 2.00, 'Client review calls', 'partial', NOW() - INTERVAL '5 days'),

  -- SEO Keyword Research (Tom Harris)
  ('00000000-0000-0000-0000-000000000086', '00000000-0000-0000-0000-000000000066', '00000000-0000-0000-0000-000000000015', 6.00, 'Primary keyword research', 'partial', NOW() - INTERVAL '10 days'),
  ('00000000-0000-0000-0000-000000000087', '00000000-0000-0000-0000-000000000066', '00000000-0000-0000-0000-000000000015', 6.00, 'Long-tail analysis', 'partial', NOW() - INTERVAL '5 days'),

  -- Social Media Report (Jordan Lee — resolved)
  ('00000000-0000-0000-0000-000000000088', '00000000-0000-0000-0000-000000000067', '00000000-0000-0000-0000-000000000013', 4.00, 'Report completed', 'final', NOW() - INTERVAL '10 days'),

  -- CRM Error (Sarah Chen — resolved)
  ('00000000-0000-0000-0000-000000000089', '00000000-0000-0000-0000-000000000068', '00000000-0000-0000-0000-000000000011', 3.50, 'Debugging and fix deployed', 'final', NOW() - INTERVAL '7 days'),

  -- Database Migration Report (Marcus Thorne)
  ('00000000-0000-0000-0000-000000000090', '00000000-0000-0000-0000-000000000069', '00000000-0000-0000-0000-000000000012', 4.00, 'Report drafted', 'partial', NOW() - INTERVAL '4 days'),

  -- Email Automation (Sarah Chen)
  ('00000000-0000-0000-0000-000000000091', '00000000-0000-0000-0000-000000000071', '00000000-0000-0000-0000-000000000011', 4.50, 'HubSpot workflow setup', 'partial', NOW() - INTERVAL '2 days'),

  -- Q3 Campaign Report (Maya Kapoor)
  ('00000000-0000-0000-0000-000000000092', '00000000-0000-0000-0000-000000000072', '00000000-0000-0000-0000-000000000014', 3.80, 'Report compiled', 'final', NOW() - INTERVAL '3 days'),

  -- Q4 Meta Ad Strategy (Sarah Chen)
  ('00000000-0000-0000-0000-000000000093', '00000000-0000-0000-0000-000000000074', '00000000-0000-0000-0000-000000000011', 1.50, 'Kickoff and audience research', 'partial', NOW() - INTERVAL '2 hours'),

  -- Competitor SEO (Tom Harris)
  ('00000000-0000-0000-0000-000000000094', '00000000-0000-0000-0000-000000000075', '00000000-0000-0000-0000-000000000015', 5.00, 'Competitor landscape mapping', 'partial', NOW() - INTERVAL '1 day'),

  -- Email Campaign Redesign (Maya Kapoor)
  ('00000000-0000-0000-0000-000000000095', '00000000-0000-0000-0000-000000000076', '00000000-0000-0000-0000-000000000014', 8.00, 'Template design v1', 'partial', NOW() - INTERVAL '3 days'),

  -- Zapier Debug (Jordan Lee)
  ('00000000-0000-0000-0000-000000000096', '00000000-0000-0000-0000-000000000077', '00000000-0000-0000-0000-000000000013', 1.20, 'Diagnosed and patched Zap', 'partial', NOW() - INTERVAL '5 hours'),

  -- LinkedIn Banners (Marcus Thorne — resolved)
  ('00000000-0000-0000-0000-000000000097', '00000000-0000-0000-0000-000000000078', '00000000-0000-0000-0000-000000000012', 6.00, 'All banners delivered', 'final', NOW() - INTERVAL '15 days')

ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- SUMMARY
-- ============================================================
-- Users:        6 (1 admin + 5 members)
-- Prompts:      3 (pm, campaigns, content)
-- Firms:        6 (Acme Corp, Globex Ltd, Stark Ent, Nexus Digital, Lumina Tech, Evergreen Retail)
-- Transcripts:  6
-- Sessions:     2
-- Tickets:     18 (mix of draft/approved/resolved across all firms)
-- Time Logs:   17
--
-- Demo login credentials:
--   Admin:  admin@marketingwiz.io    / Admin@1234
--   Member: s.chen@marketingwiz.io   / Member@1234
--   Member: m.thorne@marketingwiz.io / Member@1234
--   Member: j.lee@marketingwiz.io    / Member@1234
--   Member: m.kapoor@marketingwiz.io / Member@1234
--   Member: t.harris@marketingwiz.io / Member@1234
-- ============================================================
