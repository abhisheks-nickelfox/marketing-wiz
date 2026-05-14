-- Migration 048: Additional composite indexes for common query patterns

-- Covering index for assigneeCondition query: SELECT task_id FROM task_assignees WHERE user_id = X
-- The composite (user_id, task_id) means the entire query is answered from the index (index-only scan)
CREATE INDEX IF NOT EXISTS idx_task_assignees_user_task
  ON public.task_assignees(user_id, task_id);

-- Notifications sorted by recency per user
-- Covers: WHERE user_id = X ORDER BY created_at DESC LIMIT N
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON public.notifications(user_id, created_at DESC);
