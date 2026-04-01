import { Response } from 'express';
import { body, validationResult } from 'express-validator';
import supabase from '../config/supabase';
import { AuthenticatedRequest } from '../types';

// ─── GET /api/team ────────────────────────────────────────────────────────────

export async function listTeam(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    // ?role=member filters to members only (used by assignment dropdowns)
    const roleFilter = req.query.role as string | undefined;

    let query = supabase
      .from('users')
      .select('id, name, email, role, permissions, created_at, updated_at')
      .order('name', { ascending: true });

    if (roleFilter === 'member') {
      query = query.eq('role', 'member');
    }

    const { data: members, error } = await query;

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    const memberIds = (members ?? []).map((m: { id: string }) => m.id);

    if (memberIds.length === 0) {
      res.json({ data: [] });
      return;
    }

    // Fetch all ticket counts in one query
    const { data: ticketData } = await supabase
      .from('tickets')
      .select('assignee_id, status')
      .in('assignee_id', memberIds);

    // Build per-user count maps
    const assignedMap: Record<string, number> = {};
    const pendingMap: Record<string, number> = {};
    const resolvedMap: Record<string, number> = {};

    for (const t of ticketData ?? []) {
      const tc = t as { assignee_id: string; status: string };
      if (!tc.assignee_id) continue;
      assignedMap[tc.assignee_id] = (assignedMap[tc.assignee_id] ?? 0) + 1;
      if (tc.status === 'approved') {
        pendingMap[tc.assignee_id] = (pendingMap[tc.assignee_id] ?? 0) + 1;
      }
      if (tc.status === 'resolved') {
        resolvedMap[tc.assignee_id] = (resolvedMap[tc.assignee_id] ?? 0) + 1;
      }
    }

    // Total hours logged per user
    const { data: logData } = await supabase
      .from('time_logs')
      .select('user_id, hours')
      .in('user_id', memberIds);

    const hoursMap: Record<string, number> = {};
    for (const log of logData ?? []) {
      const l = log as { user_id: string; hours: number };
      hoursMap[l.user_id] = (hoursMap[l.user_id] ?? 0) + (l.hours ?? 0);
    }

    const membersWithStats = (members ?? []).map((m: Record<string, unknown>) => ({
      ...m,
      assigned_count: assignedMap[m.id as string] ?? 0,
      pending_count: pendingMap[m.id as string] ?? 0,
      resolved_count: resolvedMap[m.id as string] ?? 0,
      // Kept for backwards compat
      open_ticket_count: (assignedMap[m.id as string] ?? 0) - (resolvedMap[m.id as string] ?? 0),
      total_hours_logged: Number((hoursMap[m.id as string] ?? 0).toFixed(2)),
    }));

    res.json({ data: membersWithStats });
  } catch (err) {
    console.error('[team.controller] listTeam error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── GET /api/team/:id ────────────────────────────────────────────────────────

export async function getTeamMember(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;

  try {
    const { data: member, error: memberError } = await supabase
      .from('users')
      .select('id, name, email, role, permissions, created_at, updated_at')
      .eq('id', id)
      .single();

    if (memberError || !member) {
      res.status(404).json({ error: 'Team member not found' });
      return;
    }

    // Assigned tickets with firm name
    const { data: tickets, error: ticketsError } = await supabase
      .from('tickets')
      .select(
        `id, title, status, type, priority, estimated_hours, created_at, updated_at,
         firms(name),
         time_logs(hours)`
      )
      .eq('assignee_id', id)
      .order('updated_at', { ascending: false });

    if (ticketsError) {
      res.status(500).json({ error: ticketsError.message });
      return;
    }

    // Flatten firm_name and compute time_spent per ticket
    const ticketList = (tickets ?? []).map((t: Record<string, unknown>) => {
      const firms = t.firms as { name: string } | null;
      const timeLogs = t.time_logs as Array<{ hours: number }> | null;
      const time_spent = (timeLogs ?? []).reduce(
        (sum: number, l: { hours: number }) => sum + (l.hours ?? 0),
        0
      );
      return {
        ...t,
        firm_name: firms?.name ?? null,
        time_spent: Number(time_spent.toFixed(2)),
      };
    });

    // Total hours logged across all tickets for this member
    const totalHours = ticketList.reduce(
      (sum: number, t: Record<string, unknown>) => sum + ((t.time_spent as number) ?? 0),
      0
    );

    const assignedCount = ticketList.length;
    const pendingCount = ticketList.filter((t: Record<string, unknown>) => t.status === 'approved').length;
    const resolvedCount = ticketList.filter((t: Record<string, unknown>) => t.status === 'resolved').length;

    // firms_involved: unique firms with ticket count for this member (D-9)
    const firmCountMap: Record<string, number> = {};
    for (const t of ticketList) {
      const firmName = (t.firm_name as string | null) ?? 'Unknown';
      firmCountMap[firmName] = (firmCountMap[firmName] ?? 0) + 1;
    }
    const firms_involved = Object.entries(firmCountMap).map(([firm_name, ticket_count]) => ({
      firm_name,
      ticket_count,
    }));

    res.json({
      data: {
        ...member,
        tickets: ticketList,
        assigned_count: assignedCount,
        pending_count: pendingCount,
        resolved_count: resolvedCount,
        total_hours_logged: Number(totalHours.toFixed(2)),
        firms_involved,
      },
    });
  } catch (err) {
    console.error('[team.controller] getTeamMember error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── POST /api/team ───────────────────────────────────────────────────────────
// Creates a new Supabase Auth user + public.users profile

export const createTeamMemberValidation = [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),
  body('role')
    .optional()
    .isIn(['admin', 'member'])
    .withMessage('Role must be admin or member'),
  body('permissions')
    .optional()
    .isArray()
    .withMessage('Permissions must be an array'),
];

export async function createTeamMember(req: AuthenticatedRequest, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: 'Validation failed', details: errors.array() });
    return;
  }

  const { name, email, password, role = 'member', permissions = [] } = req.body as {
    name: string;
    email: string;
    password: string;
    role?: 'admin' | 'member';
    permissions?: string[];
  };

  try {
    // Create user in Supabase Auth using admin API
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError || !authData.user) {
      res.status(400).json({ error: authError?.message ?? 'Failed to create auth user' });
      return;
    }

    // Insert profile into public.users
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .insert({ id: authData.user.id, email, name, role, permissions })
      .select()
      .single();

    if (profileError || !profile) {
      // Rollback: delete the auth user
      await supabase.auth.admin.deleteUser(authData.user.id);
      res.status(500).json({ error: profileError?.message ?? 'Failed to create user profile' });
      return;
    }

    res.status(201).json({ data: profile });
  } catch (err) {
    console.error('[team.controller] createTeamMember error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── PATCH /api/team/:id ──────────────────────────────────────────────────────

export const updateTeamMemberValidation = [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be blank'),
  body('password')
    .optional()
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),
  body('role')
    .optional()
    .isIn(['admin', 'member'])
    .withMessage('Role must be admin or member'),
  body('permissions')
    .optional()
    .isArray()
    .withMessage('Permissions must be an array'),
];

// ─── DELETE /api/team/:id ─────────────────────────────────────────────────────
// Super-admin only. Deletes a user's profile row then removes their Supabase
// Auth account. Profile is deleted first to avoid FK violations; the auth
// deletion is performed second so a rollback path exists if needed.

export async function deleteTeamMember(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;

  // Prevent self-deletion — a super_admin cannot remove their own account
  if (req.user?.id === id) {
    res.status(400).json({ error: 'Cannot delete your own account' });
    return;
  }

  try {
    // Delete the public.users profile row first
    const { error: profileError } = await supabase.from('users').delete().eq('id', id);
    if (profileError) {
      res.status(500).json({ error: profileError.message });
      return;
    }

    // Remove the Supabase Auth account (cascades session invalidation)
    const { error: authError } = await supabase.auth.admin.deleteUser(id);
    if (authError) {
      res.status(500).json({ error: authError.message });
      return;
    }

    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('[team.controller] deleteTeamMember error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── PATCH /api/team/:id ──────────────────────────────────────────────────────

export async function updateTeamMember(req: AuthenticatedRequest, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: 'Validation failed', details: errors.array() });
    return;
  }

  const { id } = req.params;
  const { name, password, role, permissions } = req.body as {
    name?: string;
    password?: string;
    role?: 'admin' | 'member';
    permissions?: string[];
  };

  if (!name && !password && role === undefined && permissions === undefined) {
    res.status(400).json({ error: 'No updatable fields provided' });
    return;
  }

  try {
    // Update password in Supabase Auth (admin-only operation)
    if (password) {
      const { error: pwError } = await supabase.auth.admin.updateUserById(id, { password });
      if (pwError) {
        res.status(400).json({ error: pwError.message });
        return;
      }
    }

    // Build profile update payload
    const profileUpdate: Record<string, unknown> = {};
    if (name !== undefined) profileUpdate.name = name.trim();
    if (role !== undefined) profileUpdate.role = role;
    if (permissions !== undefined) profileUpdate.permissions = permissions;

    if (Object.keys(profileUpdate).length > 0) {
      const { data, error } = await supabase
        .from('users')
        .update(profileUpdate)
        .eq('id', id)
        .select('id, name, email, role, permissions, created_at, updated_at')
        .single();

      if (error) {
        res.status(500).json({ error: error.message });
        return;
      }

      if (!data) {
        res.status(404).json({ error: 'Team member not found' });
        return;
      }

      res.json({ data });
      return;
    }

    // Only password was updated — fetch and return the current profile
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, role, permissions, created_at, updated_at')
      .eq('id', id)
      .single();

    if (error || !data) {
      res.status(404).json({ error: 'Team member not found' });
      return;
    }

    res.json({ data });
  } catch (err) {
    console.error('[team.controller] updateTeamMember error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
