-- ============================================================
-- Migration 038: active_timers — live stopwatch state per user
--
-- Stores the currently-running timer for a user. One row per user
-- maximum (enforced by UNIQUE on user_id). When the user stops the
-- timer the row is deleted; the elapsed time is written to time_logs.
--
-- ticket_id is nullable: a timer can be started without being
-- associated with a specific ticket yet (e.g. a general work session
-- where the user assigns it to a ticket on stop). If the referenced
-- ticket is deleted, the timer row is deleted via CASCADE so orphaned
-- timers do not accumulate.
--
-- started_at TIMESTAMPTZ NOT NULL — the precision of TIMESTAMPTZ
-- (microseconds) is sufficient for any UI stopwatch. The elapsed
-- duration is computed at read time as: NOW() - started_at.
--
-- No updated_at column — the row is effectively immutable once
-- created; the only write operations are INSERT (start) and DELETE
-- (stop). There is no update path.
--
-- Do NOT wrap in BEGIN/COMMIT — Supabase SQL Editor rejects explicit
-- transaction blocks. Apply via Supabase SQL Editor.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.active_timers (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL UNIQUE
               REFERENCES public.users(id)   ON DELETE CASCADE,
  ticket_id  UUID
               REFERENCES public.tickets(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index ticket_id for "is there an active timer on this ticket?" queries
-- (used to warn other users or prevent duplicate timers per ticket)
CREATE INDEX IF NOT EXISTS idx_active_timers_ticket_id
  ON public.active_timers (ticket_id)
  WHERE ticket_id IS NOT NULL;

-- RLS
ALTER TABLE public.active_timers ENABLE ROW LEVEL SECURITY;

-- Users can only see their own active timer
CREATE POLICY "active_timers_select_own"
  ON public.active_timers FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.current_user_role() = 'admin'
  );

-- Users can only start their own timer (one row, enforced by UNIQUE)
CREATE POLICY "active_timers_insert_own"
  ON public.active_timers FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND public.current_user_role() IN ('admin', 'member', 'project_manager')
  );

-- Users can update only their own timer (e.g. re-assign ticket_id)
CREATE POLICY "active_timers_update_own"
  ON public.active_timers FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can stop (delete) only their own timer; admins can clear any
CREATE POLICY "active_timers_delete_own"
  ON public.active_timers FOR DELETE
  USING (
    user_id = auth.uid()
    OR public.current_user_role() = 'admin'
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.active_timers TO authenticated;


-- ============================================================
-- DOWN MIGRATION
-- ============================================================
/*

DROP TABLE IF EXISTS public.active_timers;

*/
