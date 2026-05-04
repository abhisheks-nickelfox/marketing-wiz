/**
 * seed_auth.js — Create Supabase Auth users for demo seed data
 *
 * Use this ONLY for hosted Supabase (supabase.com cloud).
 * For local Supabase, seed_demo.sql handles auth.users directly.
 *
 * Usage:
 *   node database/seed_auth.js
 *
 * Requires env vars (copy from backend/.env or set manually):
 *   SUPABASE_URL      — e.g. https://xxxx.supabase.co
 *   SUPABASE_SERVICE_KEY — service_role key (NOT the anon key)
 *
 * After this script succeeds, run seed_demo.sql in the SQL Editor.
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('ERROR: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const USERS = [
  { id: '00000000-0000-0000-0000-000000000001', email: 'admin@marketingwiz.io',    password: 'Admin@1234'  },
  { id: '00000000-0000-0000-0000-000000000011', email: 's.chen@marketingwiz.io',   password: 'Member@1234' },
  { id: '00000000-0000-0000-0000-000000000012', email: 'm.thorne@marketingwiz.io', password: 'Member@1234' },
  { id: '00000000-0000-0000-0000-000000000013', email: 'j.lee@marketingwiz.io',    password: 'Member@1234' },
  { id: '00000000-0000-0000-0000-000000000014', email: 'm.kapoor@marketingwiz.io', password: 'Member@1234' },
  { id: '00000000-0000-0000-0000-000000000015', email: 't.harris@marketingwiz.io', password: 'Member@1234' },
];

async function main() {
  console.log(`Creating ${USERS.length} demo auth users on ${SUPABASE_URL}...\n`);

  for (const user of USERS) {
    // Check if already exists
    const { data: existing } = await supabase.auth.admin.getUserById(user.id);
    if (existing?.user) {
      console.log(`  SKIP  ${user.email} (already exists)`);
      continue;
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,
      // Supabase Admin API does not let you set the UUID directly via createUser.
      // After creation, update the id via a raw SQL call.
    });

    if (error) {
      console.error(`  ERROR ${user.email}: ${error.message}`);
      continue;
    }

    // Rename the generated UUID to the fixed one we need
    const generatedId = data.user.id;
    if (generatedId !== user.id) {
      // Update auth.users id — requires direct DB access via rpc or postgres function.
      // Most hosted plans allow this via the SQL editor but not via the JS client.
      // Print a SQL statement to run manually if the rename fails.
      const { error: updateErr } = await supabase.rpc('exec_sql', {
        sql: `UPDATE auth.users SET id = '${user.id}' WHERE id = '${generatedId}';`,
      });

      if (updateErr) {
        console.warn(`  WARN  ${user.email}: created with id ${generatedId}.`);
        console.warn(`        Run this SQL to fix the id:`);
        console.warn(`        UPDATE auth.users SET id = '${user.id}' WHERE id = '${generatedId}';`);
        continue;
      }
    }

    console.log(`  OK    ${user.email} → ${user.id}`);
  }

  console.log('\nDone. Now run seed_demo.sql in the Supabase SQL Editor.');
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
