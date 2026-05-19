-- Migration 032: message_scope_participants
--
-- Tracks which users are participants in a chat scope (task/project/firm).
-- A user becomes a participant when they send a message, are @mentioned,
-- or reply to a message in that scope. They then get notified of all
-- subsequent messages in that scope (except their own).

CREATE TABLE message_scope_participants (
  scope     TEXT        NOT NULL,
  scope_id  UUID        NOT NULL,
  user_id   UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (scope, scope_id, user_id)
);

CREATE INDEX idx_msg_scope_participants_lookup
  ON message_scope_participants(scope, scope_id);
