import logger from '../../config/logger';
import supabase from '../../config/supabase';
import type { CreateUserDto } from './dto/create-user.dto';
import type { UpdateUserDto } from './dto/update-user.dto';
import type { Skill } from '../skills/skills.service';

// ── Types ────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  first_name: string | null;
  last_name: string | null;
  phone_number: string | null;
  avatar_url: string | null;
  email: string;
  role: 'admin' | 'member' | 'super_admin';
  member_role: string | null;
  status: 'Active' | 'invited' | 'Disabled';
  permissions: string[];
  skills: Skill[];
  created_at: string;
  updated_at: string | null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const USER_SELECT = 'id, name, first_name, last_name, phone_number, avatar_url, email, role, member_role, status, permissions, created_at, updated_at';

/** Attaches skills[] to an array of raw user rows */
async function attachSkills(users: Record<string, unknown>[]): Promise<User[]> {
  if (users.length === 0) return [];

  const ids = users.map((u) => u.id as string);

  const { data: rows, error } = await supabase
    .from('user_skills')
    .select('user_id, skills(id, name, category, created_at)')
    .in('user_id', ids);

  if (error) throw new Error(error.message);

  // Build a map: user_id → Skill[]
  const skillMap: Record<string, Skill[]> = {};
  for (const row of rows ?? []) {
    const r = row as unknown as { user_id: string; skills: Skill | null };
    if (!r.skills) continue;
    if (!skillMap[r.user_id]) skillMap[r.user_id] = [];
    skillMap[r.user_id].push(r.skills);
  }

  return users.map((u) => ({
    ...(u as object),
    skills: skillMap[u.id as string] ?? [],
  })) as User[];
}

/** Replaces a user's skill set with the given skill IDs */
async function replaceSkills(userId: string, skillIds: string[]): Promise<void> {
  // Delete all existing associations for this user
  const { error: delError } = await supabase
    .from('user_skills')
    .delete()
    .eq('user_id', userId);

  if (delError) throw new Error(delError.message);

  if (skillIds.length === 0) return;

  const rows = skillIds.map((skill_id) => ({ user_id: userId, skill_id }));
  const { error: insError } = await supabase.from('user_skills').insert(rows);
  if (insError) throw new Error(insError.message);
}

// ── Service methods ──────────────────────────────────────────────────────────

export async function findAllUsers(): Promise<User[]> {
  const { data, error } = await supabase
    .from('users')
    .select(USER_SELECT)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return attachSkills((data ?? []) as Record<string, unknown>[]);
}

export async function findUserById(id: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select(USER_SELECT)
    .eq('id', id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const [user] = await attachSkills([data as Record<string, unknown>]);
  return user ?? null;
}

export async function createUser(dto: CreateUserDto): Promise<User> {
  const { name, email, password, role = 'member', member_role, permissions = [], skill_ids = [], status = 'Active' } = dto;

  // 1. Create Supabase Auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError || !authData.user) {
    throw Object.assign(
      new Error(authError?.message ?? 'Failed to create auth user'),
      { statusCode: 400 }
    );
  }

  const userId = authData.user.id;

  // 2. Insert profile row
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .insert({
      id: userId,
      email,
      name: name.trim(),
      role,
      member_role: member_role?.trim() ?? null,
      permissions,
      status,
    })
    .select(USER_SELECT)
    .single();

  if (profileError || !profile) {
    // Rollback auth user
    await supabase.auth.admin.deleteUser(userId);
    throw new Error(profileError?.message ?? 'Failed to create user profile');
  }

  // 3. Assign skills
  if (skill_ids.length > 0) {
    try {
      await replaceSkills(userId, skill_ids);
    } catch (err) {
      // Non-fatal — user was created, skills failed
      logger.error('[users.service] skill assignment failed after user creation:', err);
    }
  }

  const [user] = await attachSkills([profile as Record<string, unknown>]);
  return user;
}

export async function updateUser(id: string, dto: UpdateUserDto): Promise<User | null> {
  const { name, first_name, last_name, phone_number, avatar_url, password, role, member_role, permissions, skill_ids, status } = dto;

  // 1. Update password in Auth if provided
  if (password) {
    const { error } = await supabase.auth.admin.updateUserById(id, { password });
    if (error) throw Object.assign(new Error(error.message), { statusCode: 400 });
  }

  // 2. Build profile update payload
  const patch: Record<string, unknown> = {};
  if (name !== undefined)         patch.name         = name.trim();
  if (first_name !== undefined)   patch.first_name   = first_name.trim() || null;
  if (last_name !== undefined)    patch.last_name    = last_name.trim() || null;
  if (phone_number !== undefined) patch.phone_number = phone_number.trim() || null;
  if (avatar_url !== undefined)   patch.avatar_url   = avatar_url || null;
  if (role !== undefined)         patch.role         = role;
  if (member_role !== undefined)  patch.member_role  = member_role.trim() || null;
  if (permissions !== undefined)  patch.permissions  = permissions;
  if (status !== undefined)       patch.status       = status;

  let updatedProfile: Record<string, unknown> | null = null;

  if (Object.keys(patch).length > 0) {
    const { data, error } = await supabase
      .from('users')
      .update(patch)
      .eq('id', id)
      .select(USER_SELECT)
      .maybeSingle();

    if (error) throw new Error(error.message);
    updatedProfile = data as Record<string, unknown> | null;
  } else {
    // No profile fields — just fetch current row
    const { data, error } = await supabase
      .from('users')
      .select(USER_SELECT)
      .eq('id', id)
      .maybeSingle();

    if (error) throw new Error(error.message);
    updatedProfile = data as Record<string, unknown> | null;
  }

  if (!updatedProfile) return null;

  // 3. Replace skills if provided
  if (skill_ids !== undefined) {
    await replaceSkills(id, skill_ids);
  }

  const [user] = await attachSkills([updatedProfile]);
  return user ?? null;
}

// ── Invite nonce helpers ─────────────────────────────────────────────────────

/** Writes a new nonce into users.invite_nonce, making any previous token stale. */
export async function storeInviteNonce(userId: string, nonce: string | null): Promise<void> {
  const { error } = await supabase
    .from('users')
    .update({ invite_nonce: nonce })
    .eq('id', userId);
  if (error) throw new Error(error.message);
}

/** Returns the current invite_nonce for a user, or null if none is set. */
export async function fetchInviteNonce(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('users')
    .select('invite_nonce')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as { invite_nonce: string | null } | null)?.invite_nonce ?? null;
}

export async function deleteUser(id: string, requesterId: string): Promise<void> {
  if (id === requesterId) {
    throw Object.assign(new Error('Cannot delete your own account'), { statusCode: 400 });
  }

  // Delete profile (cascades user_skills via FK)
  const { error: profileError } = await supabase.from('users').delete().eq('id', id);
  if (profileError) throw new Error(profileError.message);

  // Delete Auth account
  const { error: authError } = await supabase.auth.admin.deleteUser(id);
  if (authError) throw new Error(authError.message);
}
