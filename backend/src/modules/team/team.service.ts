import logger from '../../config/logger';
import supabase from '../../config/supabase';

// ── Types ────────────────────────────────────────────────────────────────────

const MEMBER_SELECT = 'id, name, email, role, permissions, created_at, updated_at';

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'member' | 'super_admin';
  permissions: string[];
  created_at: string;
  updated_at: string | null;
}

export interface TeamMemberWithStats extends TeamMember {
  assigned_count: number;
  pending_count: number;
  resolved_count: number;
  open_ticket_count: number;
  total_hours_logged: number;
}

export interface TeamMemberDetail extends TeamMember {
  tickets: TeamMemberTicket[];
  assigned_count: number;
  pending_count: number;
  resolved_count: number;
  total_hours_logged: number;
  firms_involved: Array<{ firm_name: string; ticket_count: number }>;
}

export interface TeamMemberTicket {
  id: string;
  title: string;
  status: string;
  type: string;
  priority: string;
  estimated_hours: number | null;
  created_at: string;
  updated_at: string;
  firm_name: string | null;
  time_spent: number;
}

export interface CreateTeamMemberDto {
  name: string;
  email: string;
  password: string;
  role?: 'admin' | 'member';
  permissions?: string[];
}

export interface UpdateTeamMemberDto {
  name?: string;
  password?: string;
  role?: 'admin' | 'member';
  permissions?: string[];
}

// ── Service methods ──────────────────────────────────────────────────────────

export async function findAllTeamMembers(roleFilter?: string): Promise<TeamMemberWithStats[]> {
  let query = supabase
    .from('users')
    .select(MEMBER_SELECT)
    .order('name', { ascending: true });

  if (roleFilter === 'member') {
    query = query.eq('role', 'member');
  }

  const { data: members, error } = await query;

  if (error) {
    logger.error('[team.service] findAllTeamMembers error:', error);
    throw new Error(error.message);
  }

  const memberIds = (members ?? []).map((m: { id: string }) => m.id);

  if (memberIds.length === 0) return [];

  // Batch-fetch all ticket data in two queries instead of N per-member queries
  const { data: ticketData } = await supabase
    .from('tickets')
    .select('assignee_id, status')
    .in('assignee_id', memberIds);

  const assignedMap: Record<string, number> = {};
  const pendingMap: Record<string, number> = {};
  const resolvedMap: Record<string, number> = {};

  for (const t of ticketData ?? []) {
    const tc = t as { assignee_id: string; status: string };
    if (!tc.assignee_id) continue;
    assignedMap[tc.assignee_id] = (assignedMap[tc.assignee_id] ?? 0) + 1;
    if (tc.status === 'approved') pendingMap[tc.assignee_id] = (pendingMap[tc.assignee_id] ?? 0) + 1;
    if (tc.status === 'resolved') resolvedMap[tc.assignee_id] = (resolvedMap[tc.assignee_id] ?? 0) + 1;
  }

  const { data: logData } = await supabase
    .from('time_logs')
    .select('user_id, hours')
    .in('user_id', memberIds);

  const hoursMap: Record<string, number> = {};
  for (const log of logData ?? []) {
    const l = log as { user_id: string; hours: number };
    hoursMap[l.user_id] = (hoursMap[l.user_id] ?? 0) + (l.hours ?? 0);
  }

  return (members ?? []).map((m: Record<string, unknown>) => ({
    ...(m as unknown as TeamMember),
    assigned_count: assignedMap[m.id as string] ?? 0,
    pending_count: pendingMap[m.id as string] ?? 0,
    resolved_count: resolvedMap[m.id as string] ?? 0,
    open_ticket_count: (assignedMap[m.id as string] ?? 0) - (resolvedMap[m.id as string] ?? 0),
    total_hours_logged: Number((hoursMap[m.id as string] ?? 0).toFixed(2)),
  }));
}

export async function findTeamMemberById(id: string): Promise<TeamMemberDetail | null> {
  const { data: member, error: memberError } = await supabase
    .from('users')
    .select(MEMBER_SELECT)
    .eq('id', id)
    .single();

  if (memberError || !member) return null;

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
    logger.error('[team.service] findTeamMemberById tickets error:', ticketsError);
    throw new Error(ticketsError.message);
  }

  // Flatten firm_name and compute time_spent per ticket
  const ticketList: TeamMemberTicket[] = (tickets ?? []).map((t: Record<string, unknown>) => {
    const firms = t.firms as { name: string } | null;
    const timeLogs = t.time_logs as Array<{ hours: number }> | null;
    const time_spent = (timeLogs ?? []).reduce(
      (sum: number, l: { hours: number }) => sum + (l.hours ?? 0),
      0
    );
    return {
      ...(t as unknown as TeamMemberTicket),
      firm_name: firms?.name ?? null,
      time_spent: Number(time_spent.toFixed(2)),
    };
  });

  const totalHours = ticketList.reduce((sum, t) => sum + (t.time_spent ?? 0), 0);
  const assignedCount = ticketList.length;
  const pendingCount = ticketList.filter((t) => t.status === 'approved').length;
  const resolvedCount = ticketList.filter((t) => t.status === 'resolved').length;

  // firms_involved: unique firms with ticket count for this member
  const firmCountMap: Record<string, number> = {};
  for (const t of ticketList) {
    const firmName = t.firm_name ?? 'Unknown';
    firmCountMap[firmName] = (firmCountMap[firmName] ?? 0) + 1;
  }

  const firms_involved = Object.entries(firmCountMap).map(([firm_name, ticket_count]) => ({
    firm_name,
    ticket_count,
  }));

  return {
    ...(member as TeamMember),
    tickets: ticketList,
    assigned_count: assignedCount,
    pending_count: pendingCount,
    resolved_count: resolvedCount,
    total_hours_logged: Number(totalHours.toFixed(2)),
    firms_involved,
  };
}

export async function createTeamMember(dto: CreateTeamMemberDto): Promise<TeamMember> {
  const { name, email, password, role = 'member', permissions = [] } = dto;

  // Create user in Supabase Auth using admin API
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

  // Insert profile into public.users
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .insert({ id: authData.user.id, email, name, role, permissions })
    .select(MEMBER_SELECT)
    .single();

  if (profileError || !profile) {
    // Rollback: delete the auth user
    await supabase.auth.admin.deleteUser(authData.user.id);
    throw new Error(profileError?.message ?? 'Failed to create user profile');
  }

  return profile as TeamMember;
}

export async function updateTeamMember(id: string, dto: UpdateTeamMemberDto): Promise<TeamMember | null> {
  const { name, password, role, permissions } = dto;

  // Update password in Supabase Auth (admin-only operation)
  if (password) {
    const { error: pwError } = await supabase.auth.admin.updateUserById(id, { password });
    if (pwError) throw Object.assign(new Error(pwError.message), { statusCode: 400 });
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
      .select(MEMBER_SELECT)
      .single();

    if (error) throw new Error(error.message);
    return data as TeamMember | null;
  }

  // Only password was updated — fetch and return the current profile
  const { data, error } = await supabase
    .from('users')
    .select(MEMBER_SELECT)
    .eq('id', id)
    .single();

  if (error) throw new Error(error.message);
  return data as TeamMember | null;
}

export async function deleteTeamMember(id: string): Promise<void> {
  const { error: profileError } = await supabase.from('users').delete().eq('id', id);
  if (profileError) throw new Error(profileError.message);

  const { error: authError } = await supabase.auth.admin.deleteUser(id);
  if (authError) throw new Error(authError.message);
}
