-- ============================================================
-- MarketingWiz Supabase Schema
-- ============================================================

-- 1. Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 2. TABLES
-- ============================================================

-- users profile table (extends Supabase auth.users)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- firms
CREATE TABLE public.firms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_name TEXT,
  contact_email TEXT,
  default_prompt_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- prompts
CREATE TABLE public.prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('pm', 'campaigns', 'content', 'custom')),
  system_prompt TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  firm_id UUID REFERENCES public.firms(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add FK for firms.default_prompt_id
ALTER TABLE public.firms ADD CONSTRAINT firms_default_prompt_fk
  FOREIGN KEY (default_prompt_id) REFERENCES public.prompts(id) ON DELETE SET NULL;

-- transcripts
CREATE TABLE public.transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fireflies_id TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  call_date TIMESTAMPTZ NOT NULL,
  duration_sec INTEGER,
  participants JSONB DEFAULT '[]',
  raw_transcript TEXT,
  firm_id UUID REFERENCES public.firms(id) ON DELETE SET NULL,
  archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- processing_sessions
CREATE TABLE public.processing_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transcript_id UUID NOT NULL REFERENCES public.transcripts(id) ON DELETE CASCADE,
  firm_id UUID NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  prompt_id UUID NOT NULL REFERENCES public.prompts(id) ON DELETE RESTRICT,
  text_notes TEXT,
  ai_raw_output JSONB,
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- tickets
CREATE TABLE public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.processing_sessions(id) ON DELETE SET NULL,
  firm_id UUID NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  assignee_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('task', 'design', 'development', 'account_management')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'discarded', 'resolved')),
  change_note TEXT,
  estimated_hours DECIMAL(5,2),
  ai_generated BOOLEAN DEFAULT false,
  edited BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- time_logs
CREATE TABLE public.time_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  hours DECIMAL(5,2) NOT NULL,
  comment TEXT,
  log_type TEXT NOT NULL CHECK (log_type IN ('estimate', 'partial', 'final')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. INDEXES
-- ============================================================

CREATE INDEX idx_tickets_firm_id ON public.tickets(firm_id);
CREATE INDEX idx_tickets_assignee_id ON public.tickets(assignee_id);
CREATE INDEX idx_tickets_status ON public.tickets(status);
CREATE INDEX idx_transcripts_archived ON public.transcripts(archived);
CREATE INDEX idx_time_logs_ticket_id ON public.time_logs(ticket_id);

-- ============================================================
-- 4. UPDATED_AT TRIGGER FOR TICKETS
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tickets_updated_at BEFORE UPDATE ON public.tickets
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Helper function: get current user's role from public.users
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ----------------------------------------------------------------
-- Enable RLS on all tables
-- ----------------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.firms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processing_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_logs ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------
-- USERS policies
-- Members: SELECT own row only
-- Admins: SELECT all rows
-- ----------------------------------------------------------------
CREATE POLICY users_select_own ON public.users
  FOR SELECT
  USING (
    auth.uid() = id
    OR public.current_user_role() = 'admin'
  );

CREATE POLICY users_insert_self ON public.users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY users_update_self ON public.users
  FOR UPDATE
  USING (auth.uid() = id OR public.current_user_role() = 'admin')
  WITH CHECK (auth.uid() = id OR public.current_user_role() = 'admin');

CREATE POLICY users_delete_admin ON public.users
  FOR DELETE
  USING (public.current_user_role() = 'admin');

-- ----------------------------------------------------------------
-- FIRMS policies
-- Admins: full access
-- Members: read-only
-- ----------------------------------------------------------------
CREATE POLICY firms_select ON public.firms
  FOR SELECT
  USING (
    public.current_user_role() IN ('admin', 'member')
  );

CREATE POLICY firms_insert_admin ON public.firms
  FOR INSERT
  WITH CHECK (public.current_user_role() = 'admin');

CREATE POLICY firms_update_admin ON public.firms
  FOR UPDATE
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

CREATE POLICY firms_delete_admin ON public.firms
  FOR DELETE
  USING (public.current_user_role() = 'admin');

-- ----------------------------------------------------------------
-- TRANSCRIPTS policies
-- Admins: full access
-- Members: no access
-- ----------------------------------------------------------------
CREATE POLICY transcripts_select_admin ON public.transcripts
  FOR SELECT
  USING (public.current_user_role() = 'admin');

CREATE POLICY transcripts_insert_admin ON public.transcripts
  FOR INSERT
  WITH CHECK (public.current_user_role() = 'admin');

CREATE POLICY transcripts_update_admin ON public.transcripts
  FOR UPDATE
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

CREATE POLICY transcripts_delete_admin ON public.transcripts
  FOR DELETE
  USING (public.current_user_role() = 'admin');

-- ----------------------------------------------------------------
-- PROMPTS policies
-- Admins: full access
-- Members: read-only
-- ----------------------------------------------------------------
CREATE POLICY prompts_select ON public.prompts
  FOR SELECT
  USING (
    public.current_user_role() IN ('admin', 'member')
  );

CREATE POLICY prompts_insert_admin ON public.prompts
  FOR INSERT
  WITH CHECK (public.current_user_role() = 'admin');

CREATE POLICY prompts_update_admin ON public.prompts
  FOR UPDATE
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

CREATE POLICY prompts_delete_admin ON public.prompts
  FOR DELETE
  USING (public.current_user_role() = 'admin');

-- ----------------------------------------------------------------
-- PROCESSING_SESSIONS policies
-- Admins: full access
-- Members: no access
-- ----------------------------------------------------------------
CREATE POLICY sessions_select_admin ON public.processing_sessions
  FOR SELECT
  USING (public.current_user_role() = 'admin');

CREATE POLICY sessions_insert_admin ON public.processing_sessions
  FOR INSERT
  WITH CHECK (public.current_user_role() = 'admin');

CREATE POLICY sessions_update_admin ON public.processing_sessions
  FOR UPDATE
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

CREATE POLICY sessions_delete_admin ON public.processing_sessions
  FOR DELETE
  USING (public.current_user_role() = 'admin');

-- ----------------------------------------------------------------
-- TICKETS policies
-- Admins: full access
-- Members: SELECT and UPDATE only tickets assigned to them
-- ----------------------------------------------------------------
CREATE POLICY tickets_select ON public.tickets
  FOR SELECT
  USING (
    public.current_user_role() = 'admin'
    OR (public.current_user_role() = 'member' AND assignee_id = auth.uid())
  );

CREATE POLICY tickets_insert_admin ON public.tickets
  FOR INSERT
  WITH CHECK (public.current_user_role() = 'admin');

CREATE POLICY tickets_update ON public.tickets
  FOR UPDATE
  USING (
    public.current_user_role() = 'admin'
    OR (public.current_user_role() = 'member' AND assignee_id = auth.uid())
  )
  WITH CHECK (
    public.current_user_role() = 'admin'
    OR (public.current_user_role() = 'member' AND assignee_id = auth.uid())
  );

CREATE POLICY tickets_delete_admin ON public.tickets
  FOR DELETE
  USING (public.current_user_role() = 'admin');

-- ----------------------------------------------------------------
-- TIME_LOGS policies
-- Admins: read all
-- Members: read and insert own logs
-- ----------------------------------------------------------------
CREATE POLICY time_logs_select ON public.time_logs
  FOR SELECT
  USING (
    public.current_user_role() = 'admin'
    OR (public.current_user_role() = 'member' AND user_id = auth.uid())
  );

CREATE POLICY time_logs_insert_member ON public.time_logs
  FOR INSERT
  WITH CHECK (
    public.current_user_role() IN ('admin', 'member')
    AND user_id = auth.uid()
  );

CREATE POLICY time_logs_update_admin ON public.time_logs
  FOR UPDATE
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

CREATE POLICY time_logs_delete_admin ON public.time_logs
  FOR DELETE
  USING (public.current_user_role() = 'admin');
