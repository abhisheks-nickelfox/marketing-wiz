-- Migration 045: Add 'task' scope to messages table
--
-- The messages table originally only allowed 'firm' and 'project' scopes.
-- Task-level activity panels require a 'task' scope so messages can be
-- threaded directly under individual tickets/tasks.

ALTER TABLE public.messages
  DROP CONSTRAINT IF EXISTS messages_scope_check;

ALTER TABLE public.messages
  ADD CONSTRAINT messages_scope_check
    CHECK (scope IN ('firm', 'project', 'task'));
