# Database Setup — MarketingWiz

## File Structure

```
database/
├── postgres_schema.sql   ✅ USE THIS — clean schema for EC2/plain PostgreSQL
├── seed.sql              ✅ USE THIS — default prompts and task types
├── data_only.sql         ✅ USE THIS — your real data exported from Supabase (located in backend/)
├── migrations/           ⚠️  DO NOT RUN on EC2 — written for Supabase SQL Editor only
└── legacy/               ❌ IGNORE — old Supabase-only files, kept for reference only
    ├── schema.sql             ← original Supabase schema (has RLS + auth.uid())
    ├── views_and_indexes.sql  ← old Supabase views
    ├── supabase_dump.sql      ← raw pg_dump from Supabase (has \restrict command)
    ├── seed_demo.sql          ← demo data for Supabase
    └── seed_auth.js           ← Supabase Auth user bootstrapper
```

---

## EC2 / Plain PostgreSQL Setup

### Step 1 — Create database

```bash
sudo -u postgres psql -c "CREATE USER aiwealth_user WITH PASSWORD 'AIWeatlh@2003';"
sudo -u postgres psql -c "CREATE DATABASE aiwealth_db OWNER aiwealth_user;"
sudo -u postgres psql -d aiwealth_db -c "GRANT ALL ON SCHEMA public TO aiwealth_user;"
```

### Step 2 — Apply schema (all 42 migrations baked in, no super_admin, no Supabase)

```bash
export PGPASSWORD='AIWeatlh@2003'
psql -h localhost -U aiwealth_user -d aiwealth_db -f database/postgres_schema.sql
```

### Step 3 — Restore your Supabase data

```bash
psql -h localhost -U aiwealth_user -d aiwealth_db -f data_only.sql
```

### Step 4 — (Optional) Apply seed defaults if starting fresh

```bash
psql -h localhost -U aiwealth_user -d aiwealth_db -f database/seed.sql
```

---

## What postgres_schema.sql Contains

- All 13 tables with correct constraints
- No `super_admin` role (removed in migration 039) — valid roles: `admin`, `member`, `project_manager`
- No Supabase-specific code (`auth.uid()`, `auth.users` FK, RLS policies)
- All views: `v_tickets_full`, `v_firm_ticket_stats`, `v_team_workload`
- All triggers: `updated_at` auto-update on all relevant tables
- Represents final state after all 42 migrations

---

## Why NOT to use the migrations folder on EC2

The `migrations/` folder was written for **Supabase SQL Editor** and contains:
- `auth.uid()` — Supabase-only function
- `REFERENCES auth.users(id)` — Supabase auth schema FK
- `super_admin` role references (removed in 039 but earlier files still have it)
- RLS policies that depend on Supabase Auth

Use `postgres_schema.sql` instead — it is the clean final state with none of the above.

---

## Roles

| Role | Access |
|------|--------|
| `admin` | Full access to all features |
| `member` | Own tickets, time logs, profile |
| `project_manager` | Projects + team management |

> `super_admin` was removed in migration 039. Any existing super_admin users were converted to `admin`.
