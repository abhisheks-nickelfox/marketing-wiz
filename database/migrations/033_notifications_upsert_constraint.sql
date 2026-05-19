-- Migration 033: Deduplicate inbox notifications and add unique constraint
-- so the service can use INSERT ... ON CONFLICT DO UPDATE atomically,
-- avoiding the race condition where rapid messages create multiple rows.

-- Step 1: Delete duplicates — keep only the most recently created row
-- per (user_id, scope_id) pair where scope_id is not null.
DELETE FROM notifications n1
WHERE scope_id IS NOT NULL
  AND id NOT IN (
    SELECT DISTINCT ON (user_id, scope_id) id
    FROM notifications
    WHERE scope_id IS NOT NULL
    ORDER BY user_id, scope_id, created_at DESC
  );

-- Step 2: Add the unique constraint (partial — only applies when scope_id IS NOT NULL
-- so legacy ticket-assignment notifications with scope_id = NULL are unaffected).
CREATE UNIQUE INDEX IF NOT EXISTS uq_notifications_user_scope
  ON notifications(user_id, scope_id)
  WHERE scope_id IS NOT NULL;
