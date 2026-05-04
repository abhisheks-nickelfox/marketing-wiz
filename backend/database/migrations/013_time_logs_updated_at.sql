-- Migration 013: Add updated_at to time_logs
ALTER TABLE public.time_logs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Backfill existing rows
UPDATE public.time_logs SET updated_at = created_at WHERE updated_at IS NULL;

-- Auto-update trigger
CREATE OR REPLACE FUNCTION update_time_logs_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER time_logs_updated_at
BEFORE UPDATE ON public.time_logs
FOR EACH ROW EXECUTE FUNCTION update_time_logs_updated_at();
