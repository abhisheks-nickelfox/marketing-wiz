-- ============================================================
-- Migration: 010_fix_notifications_rls.sql
-- Date:      2026-03-30
-- Author:    MarketingWiz DB Engineering
-- ============================================================
-- Summary: Enable RLS and add access policies on the notifications table.
--
-- WHY THIS IS CRITICAL:
--   Migration 006_notifications.sql created the notifications table and
--   its indexes but never called ALTER TABLE ... ENABLE ROW LEVEL SECURITY.
--   Without RLS enabled, Supabase's anon and authenticated roles can read
--   ALL notifications rows regardless of ownership — a direct data leak
--   where any authenticated user could read another user's notifications.
--
--   The backend uses the service-role key which bypasses RLS entirely, so
--   server-side reads/writes are unaffected. RLS here protects direct
--   Supabase client access (e.g., Supabase JS SDK calls from the frontend
--   if they ever use the anon/authenticated key directly, or any future
--   Realtime subscription to this table).
--
-- POLICIES ADDED:
--   SELECT  — users can only read their own notifications
--   INSERT  — users can only insert rows for themselves
--   UPDATE  — users can only update their own notifications (e.g., mark as read)
--
--   No DELETE policy is added. Notifications are append-only from the
--   application's perspective; cleanup is handled server-side by the
--   backend (service-role, bypasses RLS). If a client-side delete use
--   case emerges, add a separate DELETE policy in a future migration.
--
--   No admin-only super-policy is needed: admins have no legitimate
--   reason to read another user's notifications via the client key.
--   Admin operations go through the backend (service-role).
--
-- GRANT:
--   GRANT SELECT, INSERT, UPDATE ON notifications TO authenticated
--   is required so that the authenticated role has the privilege to
--   attempt these operations at all (RLS policies are evaluated *after*
--   privilege checks). Without the GRANT the policies are never reached.
--
-- Idempotency:
--   ALTER TABLE ... ENABLE ROW LEVEL SECURITY is safe to re-run
--   (Postgres is a no-op if RLS is already enabled).
--   DROP POLICY IF EXISTS + CREATE POLICY makes policy creation safe
--   to re-run even if a previous partial run created the policy.
--
-- Rollback: DOWN migration block is provided at the bottom of this file.
--
-- NOTE: Do NOT wrap in BEGIN/COMMIT — Supabase SQL Editor does not
-- support explicit transaction blocks. Apply via Supabase SQL Editor.
-- ============================================================


-- ============================================================
-- Step 1: Enable Row Level Security
-- ============================================================
-- Without this, all policies below are defined but never enforced.
-- Postgres silently ignores policies on tables where RLS is not enabled.
-- Safe to re-run: Postgres treats this as a no-op if already enabled.

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- Step 2: SELECT policy — users can only read their own notifications
-- ============================================================
-- USING clause filters which rows are visible during reads.
-- auth.uid() returns the UUID of the currently authenticated user
-- as set by the Supabase JWT; user_id is the FK to users(id).
--
-- No admin bypass: admins read notifications through the backend
-- (service-role key), not through the client key. Adding an admin
-- bypass here would be premature and could be a future leak vector.

DROP POLICY IF EXISTS notifications_select ON notifications;

CREATE POLICY notifications_select ON notifications
  FOR SELECT
  USING (user_id = auth.uid());


-- ============================================================
-- Step 3: INSERT policy — users can only insert for themselves
-- ============================================================
-- WITH CHECK clause validates the row being written. Requiring
-- user_id = auth.uid() prevents a user from inserting a notification
-- row on behalf of (or targeted at) another user via the client key.
--
-- In practice, notifications are always created server-side by the
-- backend (service-role, bypasses RLS). This policy closes a
-- potential abuse vector if the client key is ever used directly.

DROP POLICY IF EXISTS notifications_insert ON notifications;

CREATE POLICY notifications_insert ON notifications
  FOR INSERT
  WITH CHECK (user_id = auth.uid());


-- ============================================================
-- Step 4: UPDATE policy — users can only update their own notifications
-- ============================================================
-- The primary client-side update is marking a notification as read
-- (read = true). USING restricts which rows can be targeted;
-- WITH CHECK restricts what the resulting row can look like.
--
-- We do not add a WITH CHECK clause here beyond the implicit row
-- ownership check. The application is responsible for ensuring that
-- only the `read` boolean is changed in client-side updates; a more
-- restrictive column-level grant could enforce this but would require
-- a separate GRANT statement and adds complexity not yet warranted.

DROP POLICY IF EXISTS notifications_update ON notifications;

CREATE POLICY notifications_update ON notifications
  FOR UPDATE
  USING (user_id = auth.uid());


-- ============================================================
-- Step 5: Grant privileges to authenticated role
-- ============================================================
-- RLS policies are evaluated after privilege checks. If the
-- authenticated role has no privilege on the table, the engine
-- returns a permission-denied error before RLS is even consulted.
-- These GRANTs allow authenticated users to attempt the operations;
-- the policies above then restrict which rows they can actually touch.
--
-- INSERT and UPDATE are granted so members can create self-notifications
-- and mark notifications as read. SELECT is the primary use case.
-- No DELETE grant — see policy rationale above.

GRANT SELECT, INSERT, UPDATE ON notifications TO authenticated;


-- ============================================================
-- DOWN MIGRATION (rollback)
-- ============================================================
-- Run this block manually to reverse all changes in this file.
-- Do NOT run automatically — apply via Supabase SQL Editor as a
-- standalone block after confirming the up migration is being rolled back.
-- ============================================================

/*  ---- BEGIN DOWN MIGRATION (do not run automatically) ----

-- Revoke the grants added above
REVOKE SELECT, INSERT, UPDATE ON notifications FROM authenticated;

-- Drop the RLS policies
DROP POLICY IF EXISTS notifications_update ON notifications;
DROP POLICY IF EXISTS notifications_insert ON notifications;
DROP POLICY IF EXISTS notifications_select ON notifications;

-- Disable RLS (restores pre-migration state: no access control at DB level)
-- WARNING: this re-opens the data leak — all authenticated users can read
-- all notifications rows again until application-layer controls are verified.
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;

---- END DOWN MIGRATION ---- */
