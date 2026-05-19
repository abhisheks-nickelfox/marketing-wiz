-- Migration 031: Add message_id to notifications
-- Links a notification to the specific message that triggered it
-- (e.g. a @mention or a reply). Allows the inbox to scroll to and
-- highlight the exact message rather than loading the full thread history.

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS message_id UUID REFERENCES messages(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_message_id
  ON notifications(message_id)
  WHERE message_id IS NOT NULL;
