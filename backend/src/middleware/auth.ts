import { Response, NextFunction } from 'express';
import supabase, { anonClient } from '../config/supabase';
import { AuthenticatedRequest, User } from '../types';

/**
 * Verifies the Bearer JWT from the Authorization header via Supabase Auth,
 * then attaches the full user profile (including role) to req.user.
 */
export async function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or malformed Authorization header' });
    return;
  }

  const token = authHeader.split(' ')[1];

  // Verify token using the anon-key client — keeps the service-role client clean
  const {
    data: { user: authUser },
    error: authError,
  } = await anonClient.auth.getUser(token);

  if (authError || !authUser) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  // Fetch profile row to get the role
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single();

  if (profileError || !profile) {
    res.status(401).json({ error: 'User profile not found' });
    return;
  }

  req.user = profile as User;
  next();
}
