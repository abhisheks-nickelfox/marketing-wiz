-- Migration 049: message read receipts
-- Tracks which users have read which messages (double tick → blue tick).
-- One row per (message, user) pair — inserted on first read, never updated.

CREATE TABLE IF NOT EXISTS public.message_reads (
  message_id UUID  NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id    UUID  NOT NULL REFERENCES public.users(id)    ON DELETE CASCADE,
  read_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (message_id, user_id)
);

-- Fast lookup: "who has read this message?"
CREATE INDEX IF NOT EXISTS idx_message_reads_message_id
  ON public.message_reads(message_id);

-- Fast lookup: "which messages in a scope has this user read?"
CREATE INDEX IF NOT EXISTS idx_message_reads_user_id
  ON public.message_reads(user_id);

-- RLS not needed — backend uses a direct admin connection that bypasses row security.
