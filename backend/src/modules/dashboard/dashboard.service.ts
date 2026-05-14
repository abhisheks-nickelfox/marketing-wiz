import logger from '../../config/logger';
import { Op, QueryTypes } from 'sequelize';
import sequelize from '../../config/database';
import { Firm, Ticket, User, Transcript, TimeLog } from '../../models';
import {
  PAST_DEADLINE_STATUSES,
  STALE_APPROVED_DAYS,
  DASHBOARD_RECENT_LIMIT,
} from '../../config/constants';

// ── Types ────────────────────────────────────────────────────────────────────

export interface AdminDashboardData {
  total_firms: number;
  total_tickets: number;
  to_do_tickets: number;
  assigned_tickets: number;
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
  assigned_tickets: number;
  total_hours_logged: number;
  recent_tickets: unknown[];
}

// ── Service methods ──────────────────────────────────────────────────────────

export async function getAdminDashboard(): Promise<AdminDashboardData> {
  const [
    totalFirms,
    totalTickets,
    toDoTickets,
    assignedTickets,
    teamMembers,
    recentTranscripts,
  ] = await Promise.all([
    Firm.count(),
    Ticket.count(),
    Ticket.count({ where: { status: 'to_do' } }),
    Ticket.count({ where: { status: 'assigned' } }),
    User.count({ where: { role: 'member' } }),
    Transcript.findAll({
      where: { archived: false },
      attributes: ['id', 'title', 'call_date', 'duration_sec', 'firm_id', 'participants'],
      order: [['call_date', 'DESC']],
      limit: DASHBOARD_RECENT_LIMIT,
      raw: true,
    }),
  ]);

  // Team workload: DB-side GROUP BY aggregation instead of fetching all rows
  // and counting in application memory. Joins users table in the same query
  // to avoid a second round-trip for assignee details.
  const workloadAgg = await sequelize.query<{
    assignee_id: string;
    name:        string;
    email:       string;
    count:       string; // Sequelize returns COUNT as string
  }>(
    `SELECT t.assignee_id, u.name, u.email, COUNT(*) AS count
       FROM tickets t
       JOIN users   u ON u.id = t.assignee_id
      WHERE t.status = 'in_progress'
        AND t.assignee_id IS NOT NULL
      GROUP BY t.assignee_id, u.name, u.email`,
    { type: QueryTypes.SELECT },
  );

  return {
    total_firms:        totalFirms,
    total_tickets:      totalTickets,
    to_do_tickets:      toDoTickets,
    assigned_tickets:   assignedTickets,
    team_members:       teamMembers,
    recent_transcripts: recentTranscripts,
    team_workload:      workloadAgg.map((r) => ({
      id:    r.assignee_id,
      name:  r.name,
      email: r.email,
      count: Number(r.count),
    })),
  };
}

export async function getTeamWorkload(): Promise<TeamWorkloadRow[]> {
  // Use the existing view for this query
  const rows = await sequelize.query<{
    user_id: string;
    name: string;
    email: string;
    total_assigned: number;
    active_tickets: number;
    resolved_tickets: number;
    total_hours_logged: number;
  }>('SELECT * FROM v_team_workload', { type: QueryTypes.SELECT });

  return rows.map((row) => ({
    user:     { id: row.user_id, name: row.name, email: row.email },
    assigned: row.total_assigned    ?? 0,
    pending:  row.active_tickets    ?? 0,
    resolved: row.resolved_tickets  ?? 0,
    total_hours: row.total_hours_logged ?? 0,
  }));
}

export async function getOverdueTickets(): Promise<OverdueTicket[]> {
  const today = new Date().toISOString().split('T')[0];
  const staleThreshold = new Date(Date.now() - STALE_APPROVED_DAYS * 24 * 60 * 60 * 1000);

  const selectAttrs = ['id', 'title', 'priority', 'status', 'firm_id', 'project_id', 'assignee_id', 'created_at', 'updated_at', 'deadline'];

  const [pastDeadlineRows, staleApprovedRows] = await Promise.all([
    Ticket.findAll({
      where: {
        status:   { [Op.in]: [...PAST_DEADLINE_STATUSES] as string[] },
        deadline: { [Op.lt]: today },
        archived: false,
      },
      attributes: selectAttrs,
      order: [['deadline', 'ASC']],
      raw: true,
    }),
    Ticket.findAll({
      where: {
        status:     'assigned',
        deadline:   null,
        updated_at: { [Op.lt]: staleThreshold },
        archived:   false,
      },
      attributes: selectAttrs,
      order: [['updated_at', 'ASC']],
      raw: true,
    }),
  ]);

  // Batch-enrich with firm and assignee names
  type RawRow = Record<string, unknown> & { overdue_type: 'past_deadline' | 'stale_approved' };

  const allRows: RawRow[] = [
    ...(pastDeadlineRows as unknown as Record<string, unknown>[]).map((t) => ({ ...t, overdue_type: 'past_deadline' as const })),
    ...(staleApprovedRows as unknown as Record<string, unknown>[]).map((t) => ({ ...t, overdue_type: 'stale_approved' as const })),
  ];

  if (allRows.length === 0) return [];

  const firmIds    = [...new Set(allRows.map((t) => t.firm_id as string).filter(Boolean))];
  const assigneeIds = [...new Set(allRows.map((t) => t.assignee_id as string).filter(Boolean))];

  const firmMap: Record<string, string> = {};
  if (firmIds.length > 0) {
    const firms = await Firm.findAll({ where: { id: { [Op.in]: firmIds } }, attributes: ['id', 'name'], raw: true });
    for (const f of firms as unknown as { id: string; name: string }[]) firmMap[f.id] = f.name;
  }

  const assigneeMap: Record<string, string> = {};
  if (assigneeIds.length > 0) {
    const users = await User.findAll({ where: { id: { [Op.in]: assigneeIds } }, attributes: ['id', 'name'], raw: true });
    for (const u of users as unknown as { id: string; name: string }[]) assigneeMap[u.id] = u.name;
  }

  return allRows.map((t) => ({
    ...t,
    firms:    t.firm_id ? { name: firmMap[t.firm_id as string] } : null,
    assignee: t.assignee_id ? { name: assigneeMap[t.assignee_id as string] } : null,
  })) as unknown as OverdueTicket[];
}

export async function getMemberDashboard(userId: string): Promise<MemberDashboardData> {
  const [totalAssigned, pendingCount, timeLogs, recentTickets] = await Promise.all([
    Ticket.count({ where: { assignee_id: userId } }),
    Ticket.count({ where: { assignee_id: userId, status: 'assigned' } }),
    TimeLog.findAll({ where: { user_id: userId }, attributes: ['hours'], raw: true }),
    Ticket.findAll({
      where: { assignee_id: userId },
      attributes: ['id', 'title', 'status', 'priority', 'type', 'updated_at', 'firm_id', 'project_id'],
      order: [['updated_at', 'DESC']],
      limit: DASHBOARD_RECENT_LIMIT,
      raw: true,
    }),
  ]);

  const totalHours = (timeLogs as unknown as { hours: number }[]).reduce(
    (sum, l) => sum + (Number(l.hours) ?? 0),
    0,
  );

  // Enrich recent tickets with firm/project names
  const recentList = recentTickets as unknown as Record<string, unknown>[];
  const firmIds    = [...new Set(recentList.map((t) => t.firm_id as string).filter(Boolean))];
  const projectIds = [...new Set(recentList.map((t) => t.project_id as string).filter(Boolean))];

  const firmMap: Record<string, string> = {};
  if (firmIds.length > 0) {
    const firms = await Firm.findAll({ where: { id: { [Op.in]: firmIds } }, attributes: ['id', 'name'], raw: true });
    for (const f of firms as unknown as { id: string; name: string }[]) firmMap[f.id] = f.name;
  }

  const projectMap: Record<string, string> = {};
  if (projectIds.length > 0) {
    const projects = await sequelize.query<{ id: string; name: string }>(
      'SELECT id, name FROM projects WHERE id IN (:ids)',
      { replacements: { ids: projectIds }, type: QueryTypes.SELECT },
    );
    for (const p of projects) projectMap[p.id] = p.name;
  }

  const enrichedRecent = recentList.map((t) => ({
    ...t,
    firms:   t.firm_id    ? { name: firmMap[t.firm_id as string] }    : null,
    project: t.project_id ? { name: projectMap[t.project_id as string] } : null,
  }));

  return {
    total_assigned:      totalAssigned,
    assigned_tickets:    pendingCount,
    total_hours_logged:  Number(totalHours.toFixed(2)),
    recent_tickets:      enrichedRecent,
  };
}
