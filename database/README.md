# MarketingWiz Database Setup

## Overview

This directory contains the Supabase PostgreSQL schema and seed data for the MarketingWiz platform.

| File | Purpose |
|---|---|
| `schema.sql` | Full database schema: tables, indexes, triggers, RLS policies |
| `seed.sql` | Sample data: prompts and firms for initial setup |

---

## Running the Schema in Supabase

1. Open your [Supabase project dashboard](https://app.supabase.com).
2. Navigate to **SQL Editor** in the left sidebar.
3. Click **New query**.
4. Copy and paste the entire contents of `schema.sql` into the editor.
5. Click **Run** (or press `Ctrl+Enter` / `Cmd+Enter`).
6. Confirm there are no errors in the output panel.

> Run `schema.sql` only once on a fresh database. Re-running on an existing database will cause errors due to duplicate table/policy names. Use `DROP TABLE ... CASCADE` or Supabase migrations for subsequent changes.

---

## Loading Seed Data

After the schema has been applied successfully:

1. Open a new query in the **SQL Editor**.
2. Copy and paste the contents of `seed.sql`.
3. Click **Run**.

---

## Creating the First Admin User

Supabase manages authentication separately from application data. To create the first admin:

1. In your Supabase dashboard, go to **Authentication > Users**.
2. Click **Add user** and create the user with their email and a temporary password (or use **Invite user** to send an email invitation).
3. Copy the **UUID** shown in the Users table for the newly created user.
4. Go to **SQL Editor** and run:

```sql
INSERT INTO public.users (id, email, name, role)
VALUES (
  '<paste-user-uuid-here>',
  'admin@yourdomain.com',
  'Your Name',
  'admin'
);
```

5. The admin can now log in and add other users (members) through the application.

> **Important:** Every authenticated Supabase user needs a corresponding row in `public.users` with a valid role (`admin` or `member`) before they can access the application. The RLS policies rely on this table.

---

## Adding Member Users

After the first admin is set up, additional members can be created the same way:

```sql
INSERT INTO public.users (id, email, name, role)
VALUES (
  '<member-user-uuid>',
  'member@yourdomain.com',
  'Member Name',
  'member'
);
```

Or automate this with a Supabase **Database Webhook** or **Edge Function** that triggers on `auth.users` insert.

---

## Environment Variables

Add these to your `.env` (backend) and/or `.env.local` (frontend) files:

```env
# Supabase project URL — found in Settings > API
SUPABASE_URL=https://<your-project-ref>.supabase.co

# Anon (public) key — safe to expose in frontend
SUPABASE_ANON_KEY=<your-anon-key>

# Service role key — KEEP SECRET, backend/server use only
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# Used by backend to verify JWTs (Settings > API > JWT Secret)
SUPABASE_JWT_SECRET=<your-jwt-secret>
```

> Never expose `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_JWT_SECRET` in client-side code or public repositories.

---

## RLS Policy Summary

| Table | Admin | Member |
|---|---|---|
| `users` | Full access | Read/update own row only |
| `firms` | Full access | Read-only |
| `transcripts` | Full access | No access |
| `prompts` | Full access | Read-only |
| `processing_sessions` | Full access | No access |
| `tickets` | Full access | Read/update assigned tickets only |
| `time_logs` | Read all | Read/insert own logs only |

---

## Schema Migration Notes

For production changes after the initial schema is applied, use Supabase CLI migrations:

```bash
npx supabase migration new <migration_name>
# Edit the generated file in supabase/migrations/
npx supabase db push
```

Refer to the [Supabase CLI docs](https://supabase.com/docs/guides/cli) for full migration workflow.
