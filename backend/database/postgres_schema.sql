-- ============================================================
-- MarketingWiz — Clean PostgreSQL Schema
-- Represents the final state after all 42 migrations.
-- No Supabase-specific code (no auth.uid, no RLS, no auth.users FK).
-- Run this on a fresh database, then run postgres_seed.sql for defaults.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TRIGGER FUNCTION: auto-update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

-- ============================================================
-- TABLES
-- ============================================================

-- users
CREATE TABLE IF NOT EXISTS public.users (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email           TEXT        UNIQUE NOT NULL,
  name            TEXT        NOT NULL,
  first_name      TEXT,
  last_name       TEXT,
  phone_number    TEXT,
  avatar_url      TEXT,
  role            TEXT        NOT NULL DEFAULT 'member'
                    CHECK (role IN ('admin', 'member', 'project_manager')),
  member_role     TEXT,
  status          TEXT        NOT NULL DEFAULT 'invited'
                    CHECK (status IN ('Active', 'invited', 'Disabled')),
  permissions     TEXT[]      NOT NULL DEFAULT '{}',
  invite_nonce    TEXT,
  password_hash   TEXT,
  rate_amount     NUMERIC(10,2),
  rate_frequency  TEXT        CHECK (rate_frequency IN ('Hourly', 'Daily', 'Weekly', 'Monthly')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ
);

-- firms
CREATE TABLE IF NOT EXISTS public.firms (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name               TEXT        UNIQUE NOT NULL,
  description        TEXT,
  contact_name       TEXT,
  contact_email      TEXT,
  contact_role       TEXT,
  contact_phone      TEXT,
  location           TEXT,
  website_url        TEXT,
  logo_url           TEXT,
  account_manager_id UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  default_prompt_id  UUID,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- prompts
CREATE TABLE IF NOT EXISTS public.prompts (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT        NOT NULL,
  type          TEXT        NOT NULL CHECK (type IN ('pm', 'campaigns', 'content', 'custom')),
  content       TEXT,
  system_prompt TEXT,
  is_active     BOOLEAN     DEFAULT true,
  firm_id       UUID        REFERENCES public.firms(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- FK: firms.default_prompt_id → prompts
ALTER TABLE public.firms
  ADD CONSTRAINT firms_default_prompt_fk
    FOREIGN KEY (default_prompt_id) REFERENCES public.prompts(id) ON DELETE SET NULL;

-- transcripts
CREATE TABLE IF NOT EXISTS public.transcripts (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  fireflies_id  TEXT        UNIQUE,
  title         TEXT        NOT NULL,
  call_date     TIMESTAMPTZ,
  duration_sec  INTEGER,
  participants  JSONB       DEFAULT '[]',
  raw_transcript TEXT,
  source        TEXT,
  firm_id       UUID        REFERENCES public.firms(id) ON DELETE SET NULL,
  archived      BOOLEAN     NOT NULL DEFAULT false,
  fetched_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- processing_sessions
CREATE TABLE IF NOT EXISTS public.processing_sessions (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  transcript_id UUID        NOT NULL REFERENCES public.transcripts(id) ON DELETE CASCADE,
  firm_id       UUID        NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  prompt_id     UUID        NOT NULL REFERENCES public.prompts(id) ON DELETE RESTRICT,
  text_notes    TEXT,
  ai_raw_output JSONB,
  created_by    UUID        NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- task_types (catalog table — replaces hard-coded type CHECK on tickets)
CREATE TABLE IF NOT EXISTS public.task_types (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL UNIQUE,
  description TEXT,
  color       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- tickets
CREATE TABLE IF NOT EXISTS public.tickets (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id          UUID        REFERENCES public.processing_sessions(id) ON DELETE SET NULL,
  firm_id             UUID        NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  assignee_id         UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  project_id          UUID,
  task_type_id        UUID        REFERENCES public.task_types(id) ON DELETE SET NULL,
  title               TEXT        NOT NULL,
  description         TEXT,
  type                TEXT        NOT NULL DEFAULT 'task'
                        CHECK (type IN ('task', 'design', 'development', 'account_management')),
  priority            TEXT        NOT NULL DEFAULT 'normal'
                        CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status              TEXT        NOT NULL DEFAULT 'to_do'
                        CHECK (status IN (
                          'to_do', 'assigned', 'in_progress', 'revisions',
                          'internal_review', 'client_review', 'completed', 'blocked'
                        )),
  change_note         TEXT,
  estimated_hours     DECIMAL(5,2),
  ai_generated        BOOLEAN     NOT NULL DEFAULT false,
  edited              BOOLEAN     NOT NULL DEFAULT false,
  archived            BOOLEAN     NOT NULL DEFAULT false,
  deadline            DATE,
  regeneration_count  INTEGER     NOT NULL DEFAULT 0,
  last_regenerated_at TIMESTAMPTZ,
  revision_count      INTEGER     NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT tickets_session_ai_check CHECK (
    (session_id IS NOT NULL AND ai_generated = true)
    OR (session_id IS NULL AND ai_generated = false)
    OR (session_id IS NULL AND ai_generated = true)
  )
);

-- time_logs
CREATE TABLE IF NOT EXISTS public.time_logs (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id      UUID        NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  user_id        UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  hours          DECIMAL(5,2) NOT NULL,
  comment        TEXT,
  log_type       TEXT        NOT NULL
                   CHECK (log_type IN ('estimate', 'partial', 'final', 'revision', 'transition')),
  revision_cycle INTEGER     NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  ticket_id  UUID        REFERENCES public.tickets(id) ON DELETE CASCADE,
  type       TEXT        NOT NULL,
  message    TEXT        NOT NULL,
  read       BOOLEAN     NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- skills
CREATE TABLE IF NOT EXISTS public.skills (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL UNIQUE,
  category    TEXT,
  description TEXT,
  color       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- user_skills
CREATE TABLE IF NOT EXISTS public.user_skills (
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  skill_id   UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  experience TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, skill_id)
);

-- projects
CREATE TABLE IF NOT EXISTS public.projects (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id         UUID        NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  name            TEXT        NOT NULL,
  description     TEXT,
  status          TEXT        NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'archived')),
  workflow_status TEXT        NOT NULL DEFAULT 'todo'
                    CHECK (workflow_status IN ('todo', 'in_progress', 'in_review', 'approved', 'completed')),
  priority        TEXT        NOT NULL DEFAULT 'medium'
                    CHECK (priority IN ('high', 'medium', 'low')),
  type            TEXT,
  start_date      DATE,
  end_date        DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (firm_id, name),
  CONSTRAINT projects_dates_ordered CHECK (
    start_date IS NULL OR end_date IS NULL OR end_date >= start_date
  )
);

-- FK: tickets.project_id → projects
ALTER TABLE public.tickets
  ADD CONSTRAINT tickets_project_id_fk
    FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;

-- project_members
CREATE TABLE IF NOT EXISTS public.project_members (
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  added_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (project_id, user_id)
);

-- task_type_members
CREATE TABLE IF NOT EXISTS public.task_type_members (
  task_type_id UUID NOT NULL REFERENCES public.task_types(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  added_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (task_type_id, user_id)
);

-- messages
CREATE TABLE IF NOT EXISTS public.messages (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  scope      TEXT        NOT NULL CHECK (scope IN ('firm', 'project')),
  scope_id   UUID        NOT NULL,
  user_id    UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  parent_id  UUID        REFERENCES public.messages(id) ON DELETE CASCADE,
  body       TEXT        NOT NULL CHECK (char_length(body) BETWEEN 1 AND 10000),
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- message_reactions
CREATE TABLE IF NOT EXISTS public.message_reactions (
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  emoji      TEXT NOT NULL CHECK (char_length(emoji) BETWEEN 1 AND 8),
  PRIMARY KEY (message_id, user_id, emoji)
);

-- message_attachments
CREATE TABLE IF NOT EXISTS public.message_attachments (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID        NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  file_url   TEXT        NOT NULL,
  file_name  TEXT        NOT NULL,
  file_size  INTEGER     NOT NULL CHECK (file_size > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- project_attachments
CREATE TABLE IF NOT EXISTS public.project_attachments (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  file_url    TEXT        NOT NULL,
  file_name   TEXT        NOT NULL,
  file_size   INTEGER     NOT NULL CHECK (file_size > 0),
  file_type   TEXT,
  uploaded_by UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- active_timers
CREATE TABLE IF NOT EXISTS public.active_timers (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  ticket_id  UUID        REFERENCES public.tickets(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- org_settings
CREATE TABLE IF NOT EXISTS public.org_settings (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  logo_url   TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TRIGGERS
-- ============================================================
CREATE TRIGGER tickets_updated_at     BEFORE UPDATE ON public.tickets     FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER time_logs_updated_at   BEFORE UPDATE ON public.time_logs   FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER projects_updated_at    BEFORE UPDATE ON public.projects    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER messages_updated_at    BEFORE UPDATE ON public.messages    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER org_settings_updated_at BEFORE UPDATE ON public.org_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_tickets_firm_id          ON public.tickets(firm_id);
CREATE INDEX IF NOT EXISTS idx_tickets_assignee_id      ON public.tickets(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status           ON public.tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_project_id       ON public.tickets(project_id);
CREATE INDEX IF NOT EXISTS idx_tickets_task_type_id     ON public.tickets(task_type_id) WHERE task_type_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tickets_firm_status      ON public.tickets(firm_id, status) WHERE archived = FALSE;
CREATE INDEX IF NOT EXISTS idx_tickets_overdue_deadline ON public.tickets(deadline) WHERE deadline IS NOT NULL AND archived = FALSE AND status IN ('to_do','assigned','in_progress','revisions','internal_review','client_review');
CREATE INDEX IF NOT EXISTS idx_tickets_to_do_firm       ON public.tickets(firm_id, created_at DESC) WHERE status = 'to_do';
CREATE INDEX IF NOT EXISTS idx_tickets_assigned         ON public.tickets(assignee_id) WHERE status = 'assigned' AND archived = FALSE;
CREATE INDEX IF NOT EXISTS idx_time_logs_ticket_id      ON public.time_logs(ticket_id);
CREATE INDEX IF NOT EXISTS idx_time_logs_user_id        ON public.time_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_transcripts_archived     ON public.transcripts(archived);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id    ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user_id  ON public.project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_task_type_members_user   ON public.task_type_members(user_id);
CREATE INDEX IF NOT EXISTS idx_firms_account_manager    ON public.firms(account_manager_id) WHERE account_manager_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_projects_end_date        ON public.projects(end_date) WHERE end_date IS NOT NULL AND status = 'active';
CREATE INDEX IF NOT EXISTS idx_projects_priority        ON public.projects(firm_id, priority) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_messages_scope           ON public.messages(scope, scope_id, created_at ASC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_messages_parent_id       ON public.messages(parent_id) WHERE parent_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_messages_user_id         ON public.messages(user_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_msg    ON public.message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_message_attachments_msg  ON public.message_attachments(message_id);
CREATE INDEX IF NOT EXISTS idx_project_attachments_proj ON public.project_attachments(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_active_timers_ticket_id  ON public.active_timers(ticket_id) WHERE ticket_id IS NOT NULL;

-- ============================================================
-- VIEWS
-- ============================================================

CREATE OR REPLACE VIEW public.v_tickets_full AS
SELECT
  t.id, t.session_id, t.firm_id, t.assignee_id, t.project_id, t.task_type_id,
  t.title, t.description, t.type, t.priority, t.status, t.change_note,
  t.estimated_hours, t.ai_generated, t.edited, t.archived, t.revision_count,
  t.created_at, t.updated_at, t.deadline, t.regeneration_count, t.last_regenerated_at,
  f.name                       AS firm_name,
  p.name                       AS project_name,
  u.id                         AS assignee_user_id,
  u.name                       AS assignee_name,
  u.email                      AS assignee_email,
  COALESCE(agg.total_hours, 0) AS total_hours_spent,
  COALESCE(agg.log_count, 0)   AS time_log_count
FROM public.tickets t
LEFT JOIN public.firms    f   ON f.id = t.firm_id
LEFT JOIN public.projects p   ON p.id = t.project_id
LEFT JOIN public.users    u   ON u.id = t.assignee_id
LEFT JOIN (
  SELECT ticket_id, SUM(hours) AS total_hours, COUNT(*) AS log_count
  FROM public.time_logs
  WHERE log_type NOT IN ('final', 'revision', 'transition')
  GROUP BY ticket_id
) agg ON agg.ticket_id = t.id;

CREATE OR REPLACE VIEW public.v_team_workload AS
SELECT
  u.id                                                               AS user_id,
  u.name, u.email,
  COUNT(DISTINCT t.id)                                               AS total_assigned,
  COUNT(DISTINCT t.id) FILTER (WHERE t.status IN ('assigned','in_progress','revisions'))  AS active_tickets,
  COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'completed')        AS resolved_tickets,
  COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'to_do')            AS draft_tickets,
  COALESCE(tl_agg.total_hours, 0)                                    AS total_hours_logged
FROM public.users u
LEFT JOIN public.tickets t ON t.assignee_id = u.id AND t.archived = FALSE
LEFT JOIN (
  SELECT user_id, SUM(hours) AS total_hours
  FROM public.time_logs
  WHERE log_type NOT IN ('final', 'revision', 'transition')
  GROUP BY user_id
) tl_agg ON tl_agg.user_id = u.id
WHERE u.role IN ('member', 'project_manager')
GROUP BY u.id, u.name, u.email, tl_agg.total_hours;

CREATE OR REPLACE VIEW public.v_firm_ticket_stats AS
SELECT
  f.id AS firm_id, f.name,
  COUNT(t.id)                                          AS total_tickets,
  COUNT(t.id) FILTER (WHERE t.status = 'to_do')        AS draft_count,
  COUNT(t.id) FILTER (WHERE t.status = 'completed')    AS approved_count,
  MAX(t.created_at)                                    AS last_ticket_at
FROM public.firms f
LEFT JOIN public.tickets t ON t.firm_id = f.id AND t.archived = FALSE
GROUP BY f.id, f.name;

-- ============================================================
-- SEED DATA
-- ============================================================

-- Default task types
INSERT INTO public.task_types (name, description, color) VALUES
  ('task',               'General task or to-do item',           '#6B7280'),
  ('design',             'UI/UX design or visual asset work',     '#8B5CF6'),
  ('development',        'Software development or engineering',   '#3B82F6'),
  ('account_management', 'Client communication or account admin', '#F59E0B')
ON CONFLICT (name) DO NOTHING;

-- Default org settings row
INSERT INTO public.org_settings (id) VALUES (gen_random_uuid())
ON CONFLICT DO NOTHING;
