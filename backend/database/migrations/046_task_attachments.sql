-- Migration 046: Task Attachments
-- Creates task_attachments table for storing file uploads per task.
-- Uploaded files are stored in S3 (or as base64 data URLs in local dev).

CREATE TABLE task_attachments (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id      UUID        NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  uploaded_by  UUID        NOT NULL REFERENCES users(id),
  file_name    TEXT        NOT NULL,
  file_size    INTEGER     NOT NULL,
  mime_type    TEXT        NOT NULL,
  storage_url  TEXT        NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX task_attachments_task_id_idx ON task_attachments(task_id);

ALTER TABLE task_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow all for service role" ON task_attachments USING (true) WITH CHECK (true);
