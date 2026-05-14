-- Add actor_id to notifications so the UI can show who triggered the notification.
-- Nullable — system-generated notifications (cron, admin bulk actions) have no actor.
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS actor_id UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_actor_id ON notifications(actor_id)
  WHERE actor_id IS NOT NULL;
