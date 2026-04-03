import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error('Missing environment variable: SUPABASE_URL');
}

if (!supabaseServiceRoleKey) {
  throw new Error('Missing environment variable: SUPABASE_SERVICE_ROLE_KEY');
}

// Service-role client bypasses Row Level Security — use only on the backend.
// NEVER call supabase.auth.signInWithPassword() or supabase.auth.getUser() on
// this client — those calls attach the user's JWT to its internal session,
// contaminating subsequent DB queries so they run under user RLS instead of
// service-role (making admin-owned logs invisible to members).
const supabase: SupabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Anon-key client for auth operations only (signInWithPassword, getUser, etc.)
// Keeps the service-role client's session state permanently clean.
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
if (!supabaseAnonKey) {
  throw new Error('Missing environment variable: SUPABASE_ANON_KEY');
}
export const anonClient: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export default supabase;
