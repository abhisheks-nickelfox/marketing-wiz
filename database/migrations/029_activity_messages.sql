-- Migration 029: Add is_system flag to messages for activity log entries
-- System messages are posted automatically when assignees are added/removed
-- from tasks or projects. They appear inline in chat but styled differently.

ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT FALSE;
