import bcrypt from 'bcrypt';
import logger from '../../config/logger';
import { User, Ticket, TimeEntry } from '../../models';
import { Op, QueryTypes } from 'sequelize';

const BCRYPT_ROUNDS = 12;

// ── Types ────────────────────────────────────────────────────────────────────

const MEMBER_ATTRS = ['id', 'name', 'email', 'role', 'permissions', 'created_at', 'updated_at'];

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'member' | 'project_manager';
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
  const where: Record<string, unknown> = {};
  if (roleFilter === 'member') where.role = 'member';

  const members = await User.findAll({
    where,
    attributes: MEMBER_ATTRS,
    order: [['name', 'ASC']],
    raw: true,
  });

  const memberList = members as unknown as TeamMember[];
  const memberIds  = memberList.map((m) => m.id);

  if (memberIds.length === 0) return [];

  // Batch: tickets
  const ticketRows = await Ticket.findAll({
    where: { assignee_id: { [Op.in]: memberIds } },
    attributes: ['assignee_id', 'status'],
    raw: true,
  });

  const assignedMap: Record<string, number> = {};
  const pendingMap: Record<string, number>  = {};
  const resolvedMap: Record<string, number> = {};

  for (const t of ticketRows as unknown as { assignee_id: string; status: string }[]) {
    if (!t.assignee_id) continue;
    assignedMap[t.assignee_id] = (assignedMap[t.assignee_id] ?? 0) + 1;
    if (t.status === 'approved') pendingMap[t.assignee_id] = (pendingMap[t.assignee_id] ?? 0) + 1;
    if (t.status === 'resolved') resolvedMap[t.assignee_id] = (resolvedMap[t.assignee_id] ?? 0) + 1;
  }

  // Batch: hours from time_entries (completed entries only, not running timers)
  const entryRows = await TimeEntry.findAll({
    where: { user_id: { [Op.in]: memberIds }, is_running: false },
    attributes: ['user_id', 'duration_seconds'],
    raw: true,
  });

  const hoursMap: Record<string, number> = {};
  for (const e of entryRows as unknown as { user_id: string; duration_seconds: number | null }[]) {
    hoursMap[e.user_id] = (hoursMap[e.user_id] ?? 0) + ((e.duration_seconds ?? 0) / 3600);
  }

  return memberList.map((m) => ({
    ...m,
    assigned_count:    assignedMap[m.id] ?? 0,
    pending_count:     pendingMap[m.id]  ?? 0,
    resolved_count:    resolvedMap[m.id] ?? 0,
    open_ticket_count: (assignedMap[m.id] ?? 0) - (resolvedMap[m.id] ?? 0),
    total_hours_logged: Number((hoursMap[m.id] ?? 0).toFixed(2)),
  }));
}

export async function findTeamMemberById(id: string): Promise<TeamMemberDetail | null> {
  const member = await User.findByPk(id, { attributes: MEMBER_ATTRS, raw: true });
  if (!member) return null;

  // Fetch tickets + firm join via raw query
  const tickets = await Ticket.findAll({
    where: { assignee_id: id },
    attributes: ['id', 'title', 'status', 'type', 'priority', 'estimated_hours', 'created_at', 'updated_at', 'firm_id'],
    order: [['updated_at', 'DESC']],
    raw: true,
  });

  const ticketList = tickets as unknown as (TeamMemberTicket & { firm_id: string })[];

  // Batch firm names
  const firmIds = [...new Set(ticketList.map((t) => t.firm_id).filter(Boolean))];
  const firmMap: Record<string, string> = {};
  if (firmIds.length > 0) {
    const firms = await User.sequelize!.query<{ id: string; name: string }>(
      'SELECT id, name FROM firms WHERE id IN (:ids)',
      { replacements: { ids: firmIds }, type: QueryTypes.SELECT },
    );
    for (const f of firms) firmMap[f.id] = f.name;
  }

  // Batch time entries for per-ticket hours (completed entries only)
  const ticketIds = ticketList.map((t) => t.id);
  const timeMap: Record<string, number> = {};
  if (ticketIds.length > 0) {
    const entries = await TimeEntry.findAll({
      where: { task_id: { [Op.in]: ticketIds }, is_running: false },
      attributes: ['task_id', 'duration_seconds'],
      raw: true,
    });
    for (const e of entries as unknown as { task_id: string; duration_seconds: number | null }[]) {
      timeMap[e.task_id] = (timeMap[e.task_id] ?? 0) + ((e.duration_seconds ?? 0) / 3600);
    }
  }

  const enrichedTickets: TeamMemberTicket[] = ticketList.map((t) => ({
    id:              t.id,
    title:           t.title,
    status:          t.status,
    type:            t.type,
    priority:        t.priority,
    estimated_hours: t.estimated_hours,
    created_at:      t.created_at,
    updated_at:      t.updated_at,
    firm_name:       firmMap[t.firm_id] ?? null,
    time_spent:      Number((timeMap[t.id] ?? 0).toFixed(2)),
  }));

  const totalHours    = enrichedTickets.reduce((s, t) => s + t.time_spent, 0);
  const assignedCount = enrichedTickets.length;
  const pendingCount  = enrichedTickets.filter((t) => t.status === 'approved').length;
  const resolvedCount = enrichedTickets.filter((t) => t.status === 'resolved').length;

  const firmCountMap: Record<string, number> = {};
  for (const t of enrichedTickets) {
    const fn = t.firm_name ?? 'Unknown';
    firmCountMap[fn] = (firmCountMap[fn] ?? 0) + 1;
  }

  return {
    ...(member as unknown as TeamMember),
    tickets:        enrichedTickets,
    assigned_count: assignedCount,
    pending_count:  pendingCount,
    resolved_count: resolvedCount,
    total_hours_logged: Number(totalHours.toFixed(2)),
    firms_involved: Object.entries(firmCountMap).map(([firm_name, ticket_count]) => ({ firm_name, ticket_count })),
  };
}

export async function createTeamMember(dto: CreateTeamMemberDto): Promise<TeamMember> {
  const { name, email, password, role = 'member', permissions = [] } = dto;

  const existing = await User.findOne({ where: { email: email.toLowerCase().trim() }, raw: true });
  if (existing) {
    throw Object.assign(new Error('A user with this email already exists'), { statusCode: 400 });
  }

  const user = await User.create({
    email:       email.toLowerCase().trim(),
    name,
    role,
    permissions,
    status:      'Active',
  });

  return user.toJSON() as unknown as TeamMember;
}

export async function updateTeamMember(id: string, dto: UpdateTeamMemberDto): Promise<TeamMember | null> {
  const { name, password, role, permissions } = dto;

  const patch: Record<string, unknown> = {};
  if (name        !== undefined) patch.name        = name.trim();
  if (role        !== undefined) patch.role        = role;
  if (permissions !== undefined) patch.permissions = permissions;

  if (Object.keys(patch).length > 0) {
    await User.update(patch, { where: { id } });
  }

  const updated = await User.findByPk(id, { attributes: MEMBER_ATTRS, raw: true });
  return updated ? (updated as unknown as TeamMember) : null;
}

export async function deleteTeamMember(id: string): Promise<void> {
  await User.destroy({ where: { id } });
}
