-- ============================================================
-- Migration 036: Messages system
--
-- Three tables:
--   messages            — top-level messages scoped to a firm or project
--   message_reactions   — emoji reactions on messages (one per user per emoji)
--   message_attachments — file attachments on messages
--
-- SCOPE MODEL:
--   messages.scope     IN ('firm', 'project')
--   messages.scope_id  UUID pointing to firms.id or projects.id respectively
--
--   Design decision: a single polymorphic scope column rather than two
--   separate nullable FK columns (firm_id, project_id). Rationale: the
--   scope set is closed (only two values), the UI routes to different
--   contexts based on scope, and adding a third scope type later requires
--   only an ALTER CHECK — not a new nullable column. Trade-off: the DB
--   cannot enforce referential integrity on scope_id via a standard FK.
--   Application layer must validate that scope_id references a real
--   firm or project row before insert. If strict FK enforcement is
--   required, replace with two nullable FKs and a CHECK that exactly
--   one is non-null.
--
-- THREADING:
--   messages.parent_id self-references messages(id) ON DELETE CASCADE.
--   Only one level of threading is enforced at the application layer
--   (replies cannot have replies). The DB allows unlimited depth — if
--   product wants depth limits, enforce in the API layer.
--
-- SOFT DELETE:
--   messages.deleted_at TIMESTAMPTZ NULL — soft-delete pattern so that
--   replies can still render a "message deleted" placeholder instead of
--   disappearing. Application layer filters WHERE deleted_at IS NULL
--   for normal reads. Hard-delete is not used here.
--
-- Do NOT wrap in BEGIN/COMMIT — Supabase SQL Editor rejects explicit
-- transaction blocks. Apply via Supabase SQL Editor.
-- ============================================================


-- ============================================================
-- 1. messages
-- ============================================================
CREATE TABLE IF NOT EXISTS public.messages (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  scope      TEXT        NOT NULL CHECK (scope IN ('firm', 'project')),
  scope_id   UUID        NOT NULL,   -- points to firms.id or projects.id
  user_id    UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  parent_id  UUID        REFERENCES public.messages(id) ON DELETE CASCADE,
  body       TEXT        NOT NULL CHECK (char_length(body) BETWEEN 1 AND 10000),
  deleted_at TIMESTAMPTZ,            -- NULL = not deleted
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-update trigger
CREATE TRIGGER messages_updated_at
  BEFORE UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Indexes
-- Primary read pattern: all messages for a scope context, newest last
CREATE INDEX IF NOT EXISTS idx_messages_scope
  ON public.messages (scope, scope_id, created_at ASC)
  WHERE deleted_at IS NULL;

-- Thread fetch: replies to a specific parent message
CREATE INDEX IF NOT EXISTS idx_messages_parent_id
  ON public.messages (parent_id)
  WHERE parent_id IS NOT NULL AND deleted_at IS NULL;

-- User's own messages (for profile/audit views)
CREATE INDEX IF NOT EXISTS idx_messages_user_id
  ON public.messages (user_id);

-- RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read non-deleted messages
CREATE POLICY "messages_select"
  ON public.messages FOR SELECT
  USING (
    deleted_at IS NULL
    AND public.current_user_role() IN ('admin', 'member', 'project_manager')
  );

-- Any authenticated user can post a message
CREATE POLICY "messages_insert"
  ON public.messages FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND public.current_user_role() IN ('admin', 'member', 'project_manager')
  );

-- Authors can edit/soft-delete their own messages; admins can edit any
CREATE POLICY "messages_update"
  ON public.messages FOR UPDATE
  USING (
    user_id = auth.uid()
    OR public.current_user_role() = 'admin'
  )
  WITH CHECK (
    user_id = auth.uid()
    OR public.current_user_role() = 'admin'
  );

-- Hard delete: admin only (soft-delete is preferred; hard-delete for GDPR)
CREATE POLICY "messages_delete"
  ON public.messages FOR DELETE
  USING (public.current_user_role() = 'admin');

GRANT SELECT, INSERT, UPDATE ON public.messages TO authenticated;


-- ============================================================
-- 2. message_reactions
-- ============================================================
CREATE TABLE IF NOT EXISTS public.message_reactions (
  message_id UUID   NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id    UUID   NOT NULL REFERENCES public.users(id)    ON DELETE CASCADE,
  emoji      TEXT   NOT NULL CHECK (char_length(emoji) BETWEEN 1 AND 8),
  PRIMARY KEY (message_id, user_id, emoji)
);

-- Lookup reactions per message
CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id
  ON public.message_reactions (message_id);

-- Lookup all reactions by a user (for un-react flows)
CREATE INDEX IF NOT EXISTS idx_message_reactions_user_id
  ON public.message_reactions (user_id);

-- RLS
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reactions_select"
  ON public.message_reactions FOR SELECT
  USING (public.current_user_role() IN ('admin', 'member', 'project_manager'));

-- Users can only add/remove their own reactions
CREATE POLICY "reactions_insert"
  ON public.message_reactions FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND public.current_user_role() IN ('admin', 'member', 'project_manager')
  );

CREATE POLICY "reactions_delete"
  ON public.message_reactions FOR DELETE
  USING (
    user_id = auth.uid()
    OR public.current_user_role() = 'admin'
  );

GRANT SELECT, INSERT, DELETE ON public.message_reactions TO authenticated;


-- ============================================================
-- 3. message_attachments
-- ============================================================
CREATE TABLE IF NOT EXISTS public.message_attachments (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id  UUID        NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  file_url    TEXT        NOT NULL,
  file_name   TEXT        NOT NULL,
  file_size   INTEGER     NOT NULL CHECK (file_size > 0),  -- bytes
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Primary access pattern: all attachments for a message
CREATE INDEX IF NOT EXISTS idx_message_attachments_message_id
  ON public.message_attachments (message_id);

-- RLS
ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "attachments_select"
  ON public.message_attachments FOR SELECT
  USING (public.current_user_role() IN ('admin', 'member', 'project_manager'));

CREATE POLICY "attachments_insert"
  ON public.message_attachments FOR INSERT
  WITH CHECK (
    public.current_user_role() IN ('admin', 'member', 'project_manager')
  );

-- Only admins can hard-delete attachments
CREATE POLICY "attachments_delete"
  ON public.message_attachments FOR DELETE
  USING (public.current_user_role() = 'admin');

GRANT SELECT, INSERT ON public.message_attachments TO authenticated;


-- ============================================================
-- DOWN MIGRATION
-- ============================================================
/*

DROP TABLE IF EXISTS public.message_attachments;
DROP TABLE IF EXISTS public.message_reactions;
DROP TABLE IF EXISTS public.messages;

*/
