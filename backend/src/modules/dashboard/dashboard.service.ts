import logger from '../../config/logger';
import supabase from '../../config/supabase';
import {
  PAST_DEADLINE_STATUSES,
  STALE_APPROVED_DAYS,
  DASHBOARD_RECENT_LIMIT,
} from '../../config/constants';

// ── Types ────────────────────────────────────────────────────────────────────

export interface AdminDashboardData {
  total_firms: number;
  total_tickets: number;
  pending_tickets: number;
  approved_tickets: number;
  team_members: number;
  recent_transcripts: unknown[];
  team_workload: Array<{ id: string; name: string; email: string; count: number }>;
}

export interface TeamWorkloadRow {
  user: { id: string; name: string; email: string };
  assigned: number;
  pending: number;
  resolved: number;
  total_hours: number;
}

export interface OverdueTicket {
  id: string;
  title: string;
  priority: string;
  status: string;
  firm_id: string;
  project_id: string | null;
  assignee_id: string | null;
  created_at: string;
  updated_at: string;
  deadline: string | null;
  overdue_type: 'past_deadline' | 'stale_approved';
}

export interface MemberDashboardData {
  total_assigned: number;
  pending_tickets: number;
  total_hours_logged: number;
  recent_tickets: unknown[];
}

// PAST_DEADLINE_STATUSES and STALE_APPROVED_DAYS are imported from config/constants.

// ── Service methods ──────────────────────────────────────────────────────────

export async function getAdminDashboard(): Promise<AdminDashboardData> {
  const [
    firmsResult,
    ticketsResult,
    pendingResult,
    approvedResult,
    teamResult,
    recentTranscriptsResult,
  ] = await Promise.all([
    supabase.from('firms').select('id', { count: 'exact', head: true }),
    supabase.from('tickets').select('id', { count: 'exact', head: true }),
    supabase.from('tickets').select('id', { count: 'exact', head: true }).eq('status', 'draft'),
    supabase.from('tickets').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
    supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'member'),
    supabase
      .from('transcripts')
      .select('id, title, call_date, duration_sec, firm_id, participants')
      .eq('archived', false)
      .order('call_date', { ascending: false })
      .limit(DASHBOARD_RECENT_LIMIT),
  ]);

  // Team workload: count of approved tickets per assignee
  const { data: workloadData } = await supabase
    .from('tickets')
    .select('assignee_id, assignee:users!tickets_assignee_id_fkey(name, email)')
    .eq('status', 'approved')
    .not('assignee_id', 'is', null);

  const workloadMap: Record<string, { name: string; email: string; count: number }> = {};

  if (workloadData) {
    for (const row of (workloadData as unknown) as Array<{
      assignee_id: string;
      assignee: { name: string; email: string } | null;
    }>) {
      if (!row.assignee_id) continue;
      if (!workloadMap[row.assignee_id]) {
        workloadMap[row.assignee_id] = {
          name: row.assignee?.name ?? 'Unknown',
          email: row.assignee?.email ?? '',
          count: 0,
        };
      }
      workloadMap[row.assignee_id].count++;
    }
  }

  return {
    total_firms: firmsResult.count ?? 0,
    total_tickets: ticketsResult.count ?? 0,
    pending_tickets: pendingResult.count ?? 0,
    approved_tickets: approvedResult.count ?? 0,
    team_members: teamResult.count ?? 0,
    recent_transcripts: recentTranscriptsResult.data ?? [],
    team_workload: Object.entries(workloadMap).map(([id, v]) => ({ id, ...v })),
  };
}

export async function getTeamWorkload(): Promise<TeamWorkloadRow[]> {
  // Single view scan replaces 3N per-member COUNT queries (ISSUE-029)
  const { data, error } = await supabase.from('v_team_workload').select('*');

  if (error) {
    logger.error('[dashboard.service] getTeamWorkload error:', error);
    throw new Error(error.message);
  }

  return (data ?? []).map((row: {
    user_id: string;
    name: string;
    email: string;
    total_assigned: number;
    active_tickets: number;
    resolved_tickets: number;
    total_hours_logged: number;
  }) => ({
    user: { id: row.user_id, name: row.name, email: row.email },
    assigned: row.total_assigned ?? 0,
    pending: row.active_tickets ?? 0,
    resolved: row.resolved_tickets ?? 0,
    total_hours: row.total_hours_logged ?? 0,
  }));
}

export async function getOverdueTickets(): Promise<OverdueTicket[]> {
  const today = new Date().toISOString().split('T')[0];
  const staleThreshold = new Date(
    Date.now() - STALE_APPROVED_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  const selectClause =
    'id, title, priority, status, firm_id, project_id, assignee_id, created_at, updated_at, deadline, ' +
    'firms(name), assignee:users!tickets_assignee_id_fkey(name)';

  // Query 1: tickets with a past deadline in any active status
  const { data: pastDeadlineData, error: err1 } = await supabase
    .from('tickets')
    .select(selectClause)
    .in('status', PAST_DEADLINE_STATUSES as unknown as string[])
    .lt('deadline', today)
    .eq('archived', false)
    .order('deadline', { ascending: true });

  if (err1) {
    logger.error('[dashboard.service] getOverdueTickets past_deadline query error:', err1);
    throw new Error(err1.message);
  }

  // Query 2: approved tickets with no deadline untouched for STALE_APPROVED_DAYS+ days
  const { data: staleApprovedData, error: err2 } = await supabase
    .from('tickets')
    .select(selectClause)
    .eq('status', 'approved')
    .is('deadline', null)
    .lt('updated_at', staleThreshold)
    .eq('archived', false)
    .order('updated_at', { ascending: true });

  if (err2) {
    logger.error('[dashboard.service] getOverdueTickets stale_approved query error:', err2);
    throw new Error(err2.message);
  }

  // Tag each result with its overdue_type for contextual frontend labels
  return [
    ...(pastDeadlineData ?? []).map((t) => ({
      ...(t as unknown as Record<string, unknown>),
      overdue_type: 'past_deadline' as const,
    })),
    ...(staleApprovedData ?? []).map((t) => ({
      ...(t as unknown as Record<string, unknown>),
      overdue_type: 'stale_approved' as const,
    })),
  ] as OverdueTicket[];
}

export async function getMemberDashboard(userId: string): Promise<MemberDashboardData> {
  const [assignedResult, pendingResult, timeLogsResult] = await Promise.all([
    supabase.from('tickets').select('id', { count: 'exact', head: true }).eq('assignee_id', userId),
    supabase
      .from('tickets')
      .select('id', { count: 'exact', head: true })
      .eq('assignee_id', userId)
      .eq('status', 'approved'),
    supabase.from('time_logs').select('hours').eq('user_id', userId),
  ]);

  const totalHours = (timeLogsResult.data ?? []).reduce(
    (sum: number, log: { hours: number }) => sum + (log.hours ?? 0),
    0
  );

  const { data: recentTickets } = await supabase
    .from('tickets')
    .select('id, title, status, priority, type, updated_at, firm_id, project_id, firms(name), project:projects(name)')
    .eq('assignee_id', userId)
    .order('updated_at', { ascending: false })
    .limit(DASHBOARD_RECENT_LIMIT);

  return {
    total_assigned: assignedResult.count ?? 0,
    pending_tickets: pendingResult.count ?? 0,
    total_hours_logged: Number(totalHours.toFixed(2)),
    recent_tickets: recentTickets ?? [],
  };
}
