ALTER TABLE notifications ADD COLUMN IF NOT EXISTS scope TEXT NOT NULL DEFAULT 'task';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS scope_id UUID;
-- back-fill scope_id from ticket_id on existing rows
UPDATE notifications SET scope_id = ticket_id WHERE ticket_id IS NOT NULL AND scope_id IS NULL;
