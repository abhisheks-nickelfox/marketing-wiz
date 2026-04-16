import logger from '../../config/logger';
import supabase, { anonClient } from '../../config/supabase';

// ── Types ────────────────────────────────────────────────────────────────────

export interface LoginResult {
  user: unknown;
  token: string;
}

// ── Service methods ──────────────────────────────────────────────────────────

export async function loginUser(email: string, password: string): Promise<LoginResult> {
  // Use the anon client — NOT the service-role client — for signInWithPassword.
  // Calling it on the service-role singleton attaches the user's JWT to its
  // internal session, causing all subsequent DB queries to run under user RLS
  // and hiding admin-owned logs (revision markers, transition logs) from members.
  const { data: authData, error: authError } = await anonClient.auth.signInWithPassword({
    email,
    password,
  });

  if (authError || !authData.session) {
    throw Object.assign(
      new Error(authError?.message ?? 'Login failed'),
      { statusCode: 401 }
    );
  }

  // Fetch full profile
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('*')
    .eq('id', authData.user.id)
    .single();

  if (profileError || !profile) {
    throw new Error('Could not load user profile');
  }

  return { user: profile, token: authData.session.access_token };
}

export async function updateUserProfile(userId: string, name: string): Promise<unknown> {
  const { data, error } = await supabase
    .from('users')
    .update({ name })
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    logger.error('[auth.service] updateUserProfile error:', error);
    throw new Error(error.message);
  }

  return data;
}
