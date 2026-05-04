-- Migration 028: Add rate_amount and rate_frequency to users table

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS rate_amount    NUMERIC(10, 2) NULL,
  ADD COLUMN IF NOT EXISTS rate_frequency TEXT           NULL
    CHECK (rate_frequency IN ('Hourly', 'Daily', 'Weekly', 'Monthly'));
