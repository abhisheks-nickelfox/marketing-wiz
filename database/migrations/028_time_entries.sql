CREATE TABLE IF NOT EXISTS time_entries (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id          UUID        NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  user_id          UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  started_at       TIMESTAMPTZ NOT NULL,
  ended_at         TIMESTAMPTZ,
  duration_seconds INTEGER,
  description      TEXT,
  is_billable      BOOLEAN     NOT NULL DEFAULT false,
  is_running       BOOLEAN     NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_time_entries_task_id ON time_entries(task_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_user_id ON time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_running  ON time_entries(user_id) WHERE is_running = true;

CREATE OR REPLACE FUNCTION update_time_entries_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS time_entries_updated_at ON time_entries;
CREATE TRIGGER time_entries_updated_at
  BEFORE UPDATE ON time_entries
  FOR EACH ROW EXECUTE FUNCTION update_time_entries_updated_at();
