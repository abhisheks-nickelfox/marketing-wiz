  -- Migration 015: Expand ticket status workflow
  -- Drops the old 4-value check constraint and replaces it with the full 10-value set.
  -- Renames existing 'approved' rows to 'in_progress' so that 'approved' can carry its
  -- new meaning (post-compliance sign-off) without conflicting with existing data.

  ALTER TABLE tickets
    DROP CONSTRAINT IF EXISTS tickets_status_check;

  ALTER TABLE tickets
    ADD CONSTRAINT tickets_status_check CHECK (
      status IN (
        'draft', 'in_progress', 'resolved',
        'internal_review', 'client_review', 'compliance_review',
        'approved', 'closed', 'revisions', 'discarded'
      )
    );

  -- Rename existing 'approved' rows to 'in_progress'
  UPDATE tickets SET status = 'in_progress' WHERE status = 'approved';
