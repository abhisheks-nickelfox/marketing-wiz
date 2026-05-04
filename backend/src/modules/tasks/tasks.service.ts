import logger from '../../config/logger';
import { Op } from 'sequelize';
import sequelize from '../../config/database';
import { Ticket, Firm, User, Project, TimeLog, Notification } from '../../models';
import {
  STATUS_PRIORITY,
  VALID_TRANSITIONS,
  PAST_DEADLINE_STATUSES,
  STALE_APPROVED_DAYS,
} from '../../config/constants';

// ── Types ────────────────────────────────────────────────────────────────────

export interface CreateTaskDto {
  firm_id: string;
  title: string;
  type: 'task' | 'design' | 'development' | 'account_management';
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  description?: string;
}

export interface UpdateTaskDto {
  title?: string;
  description?: string;
  type?: string;
  priority?: string;
  change_note?: string;
  estimated_hours?: number;
}

export interface AssignApproveDto {
  assignee_id: string;
  priority?: string;
  deadline?: string;
  project_id?: string;
}

// ── Service methods ──────────────────────────────────────────────────────────

export async function findAllTasks(options: {
  userId: string;
  userRole: string;
  userPermissions: string[];
  filters: Record<string, string>;
}): Promise<unknown[]> {
  const { userId, userRole, userPermissions, filters } = options;

  const canViewAll =
    userRole === 'admin' ||
    userPermissions.includes('view_all_tickets');

  // Build WHERE clause
  const where: Record<string, unknown> = {};

  if (!canViewAll) {
    where.assignee_id = userId;
    where.archived = false;
  } else {
    const { firm_id, assignee_id, status, type, priority, archived, project_id, overdue, session_id } = filters;

    if (firm_id)     where.firm_id     = firm_id;
    if (assignee_id) where.assignee_id = assignee_id;
    if (type)        where.type        = type;
    if (priority)    where.priority    = priority;
    if (project_id)  where.project_id  = project_id;
    if (session_id)  where.session_id  = session_id;

    if (overdue === 'true') {
      const today = new Date().toISOString().split('T')[0];
      const staleThreshold = new Date(Date.now() - STALE_APPROVED_DAYS * 24 * 60 * 60 * 1000);
      where.archived = false;
      where[Op.or as unknown as string] = [
        {
          deadline: { [Op.lt]: today },
          status: { [Op.in]: [...PAST_DEADLINE_STATUSES] as string[] },
        },
        {
          status: 'assigned',
          deadline: null,
          updated_at: { [Op.lt]: staleThreshold },
        },
      ];
    } else {
      if (status) {
        where.status = status;
      }
      where.archived = archived === 'true' ? true : false;
    }
  }

  const rows = await Ticket.findAll({
    where,
    order: [['updated_at', 'DESC']],
    raw: true,
  });

  if (rows.length === 0) return [];

  const ticketList = rows as unknown as Record<string, unknown>[];
  const ticketIds  = ticketList.map((t) => t.id as string);
  const firmIds    = [...new Set(ticketList.map((t) => t.firm_id as string).filter(Boolean))];
  const projectIds = [...new Set(ticketList.map((t) => t.project_id as string).filter(Boolean))];
  const assigneeIds = [...new Set(ticketList.map((t) => t.assignee_id as string).filter(Boolean))];

  // Batch: firm names
  const firmMap: Record<string, string> = {};
  if (firmIds.length > 0) {
    const firms = await Firm.findAll({ where: { id: { [Op.in]: firmIds } }, attributes: ['id', 'name'], raw: true });
    for (const f of firms as unknown as { id: string; name: string }[]) firmMap[f.id] = f.name;
  }

  // Batch: project names
  const projectMap: Record<string, string> = {};
  if (projectIds.length > 0) {
    const projects = await Project.findAll({ where: { id: { [Op.in]: projectIds } }, attributes: ['id', 'name'], raw: true });
    for (const p of projects as unknown as { id: string; name: string }[]) projectMap[p.id] = p.name;
  }

  // Batch: assignee details
  const assigneeMap: Record<string, { name: string; email: string }> = {};
  if (assigneeIds.length > 0) {
    const assignees = await User.findAll({ where: { id: { [Op.in]: assigneeIds } }, attributes: ['id', 'name', 'email'], raw: true });
    for (const u of assignees as unknown as { id: string; name: string; email: string }[]) assigneeMap[u.id] = { name: u.name, email: u.email };
  }

  // Batch: time logs for time_spent computation
  const timeMap: Record<string, number> = {};
  if (ticketIds.length > 0) {
    const logs = await TimeLog.findAll({
      where: { ticket_id: { [Op.in]: ticketIds }, log_type: { [Op.notIn]: ['final', 'revision'] } },
      attributes: ['ticket_id', 'hours'],
      raw: true,
    });
    for (const l of logs as unknown as { ticket_id: string; hours: number }[]) {
      timeMap[l.ticket_id] = (timeMap[l.ticket_id] ?? 0) + Number(l.hours ?? 0);
    }
  }

  const enriched = ticketList.map((t) => {
    const aid = t.assignee_id as string | null;
    const pid = t.project_id as string | null;
    return {
      ...t,
      firms:    t.firm_id ? { name: firmMap[t.firm_id as string] ?? null } : null,
      assignee: aid ? assigneeMap[aid] ?? null : null,
      project:  pid ? { name: projectMap[pid] ?? null } : null,
      time_spent: Number((timeMap[t.id as string] ?? 0).toFixed(2)),
    };
  });

  // Sort by status priority, then most-recently-updated within same status
  (enriched as unknown as Record<string, unknown>[]).sort((a, b) => {
    const pa = STATUS_PRIORITY[a['status'] as string] ?? 99;
    const pb = STATUS_PRIORITY[b['status'] as string] ?? 99;
    if (pa !== pb) return pa - pb;
    return new Date(b['updated_at'] as string).getTime() - new Date(a['updated_at'] as string).getTime();
  });

  return enriched;
}

export async function findTaskById(id: string): Promise<unknown | null> {
  const task = await Ticket.findByPk(id, { raw: true });
  if (!task) return null;

  const t = task as unknown as Record<string, unknown>;

  // Fetch firm and assignee
  let firms: { name: string; contact_name: string | null; contact_email: string | null } | null = null;
  if (t.firm_id) {
    const f = await Firm.findByPk(t.firm_id as string, { attributes: ['name', 'contact_name', 'contact_email'], raw: true });
    if (f) firms = f as unknown as typeof firms;
  }

  let assignee: { id: string; name: string; email: string } | null = null;
  if (t.assignee_id) {
    const u = await User.findByPk(t.assignee_id as string, { attributes: ['id', 'name', 'email'], raw: true });
    if (u) assignee = u as unknown as typeof assignee;
  }

  return { ...t, firms, assignee };
}

export async function createTask(dto: CreateTaskDto): Promise<unknown> {
  const { firm_id, title, type, priority = 'normal', description } = dto;

  const firm = await Firm.findByPk(firm_id, { attributes: ['id'], raw: true });
  if (!firm) {
    throw Object.assign(new Error('Firm not found'), { statusCode: 404 });
  }

  const ticket = await Ticket.create({
    firm_id,
    title:       title.trim(),
    type,
    priority,
    description: description?.trim() ?? '',
    session_id:  null,
    ai_generated: false,
    status:      'to_do',
    assignee_id: null,
    edited:      false,
    change_note: '',
  });

  return ticket.toJSON();
}

export async function updateTask(
  id: string,
  updates: Record<string, unknown>,
): Promise<unknown | null> {
  await Ticket.update(updates, { where: { id } });

  const row = await Ticket.findByPk(id, { raw: true });
  return row ?? null;
}

export async function findRawTask(id: string): Promise<Record<string, unknown> | null> {
  const row = await Ticket.findByPk(id, { raw: true });
  return row ? (row as unknown as Record<string, unknown>) : null;
}

export async function assignAndApproveTask(
  id: string,
  dto: AssignApproveDto,
): Promise<unknown | null> {
  const { assignee_id, priority, deadline, project_id } = dto;

  // Verify assignee exists
  const assignee = await User.findByPk(assignee_id, { attributes: ['id'], raw: true });
  if (!assignee) {
    throw Object.assign(new Error('Assignee user not found'), { statusCode: 400 });
  }

  const updatePayload: Record<string, unknown> = {
    assignee_id,
    status:     'assigned',
    updated_at: new Date().toISOString(),
  };
  if (priority)   updatePayload.priority   = priority;
  if (deadline)   updatePayload.deadline   = deadline;
  if (project_id) updatePayload.project_id = project_id;

  // Only assign to_do tasks
  const [count] = await Ticket.update(updatePayload, {
    where: { id, status: 'to_do' },
  });

  if (count === 0) return null;

  const updated = await Ticket.findByPk(id, { raw: true });
  if (!updated) return null;

  // Notify assignee
  const t = updated as unknown as Record<string, unknown>;
  await Notification.create({
    user_id:   assignee_id,
    title:     'New task assigned',
    message:   t.title as string,
    ticket_id: t.id as string,
    read:      false,
  });

  return t;
}

export async function discardTask(id: string): Promise<unknown | null> {
  const [count] = await Ticket.update(
    { status: 'blocked', updated_at: new Date().toISOString() },
    { where: { id, status: 'to_do' } },
  );

  if (count === 0) return null;

  return Ticket.findByPk(id, { raw: true });
}

export async function deleteTask(id: string): Promise<void> {
  await Ticket.destroy({ where: { id } });
}

export async function archiveTask(id: string, archived: boolean): Promise<unknown | null> {
  await Ticket.update({ archived }, { where: { id } });
  return Ticket.findByPk(id, { raw: true });
}

export async function transitionTask(options: {
  ticketId: string;
  targetStatus: string;
  changeNote?: string;
  userId: string;
}): Promise<unknown | null> {
  const { ticketId, targetStatus, changeNote, userId } = options;

  const current = await Ticket.findByPk(ticketId, {
    attributes: ['id', 'status', 'revision_count'],
    raw: true,
  });

  if (!current) return null;

  const c = current as unknown as { id: string; status: string; revision_count: number };

  const allowed = VALID_TRANSITIONS[c.status] ?? [];
  if (!allowed.includes(targetStatus)) {
    throw Object.assign(
      new Error(`Cannot transition task from '${c.status}' to '${targetStatus}'`),
      { statusCode: 400 },
    );
  }

  const updates: Record<string, unknown> = {
    status:     targetStatus,
    updated_at: new Date().toISOString(),
  };
  if (changeNote !== undefined) updates.change_note = changeNote;
  if (targetStatus === 'to_do')       updates.assignee_id   = null;
  if (targetStatus === 'revisions')   updates.revision_count = (c.revision_count ?? 0) + 1;

  await Ticket.update(updates, { where: { id: ticketId } });

  // Audit / milestone log
  if (targetStatus === 'revisions') {
    const newCycle = (c.revision_count ?? 0) + 1;
    await TimeLog.create({
      ticket_id:      ticketId,
      user_id:        userId,
      hours:          0,
      comment:        changeNote ?? '',
      log_type:       'revision',
      revision_cycle: newCycle,
    }).catch((err) => logger.error('[tasks.service] Failed to insert revision marker log:', err));
  } else {
    await TimeLog.create({
      ticket_id:      ticketId,
      user_id:        userId,
      hours:          0,
      comment:        targetStatus,
      log_type:       'transition',
      revision_cycle: c.revision_count ?? 0,
    }).catch((err) => logger.error('[tasks.service] Failed to insert transition log:', err));
  }

  return Ticket.findByPk(ticketId, { raw: true });
}

export async function resolveTask(options: {
  ticketId: string;
  userId: string;
  finalComment?: string;
  estimatedHours?: number;
}): Promise<unknown | null> {
  const { ticketId, userId, finalComment, estimatedHours } = options;

  const current = await Ticket.findByPk(ticketId, {
    attributes: ['id', 'assignee_id', 'status', 'revision_count'],
    raw: true,
  });

  if (!current) return null;

  const c = current as unknown as { id: string; assignee_id: string; status: string; revision_count: number };

  const updates: Record<string, unknown> = {
    status:     'completed',
    updated_at: new Date().toISOString(),
  };
  if (estimatedHours !== undefined) updates.estimated_hours = estimatedHours;

  await Ticket.update(updates, { where: { id: ticketId } });

  // Create a final time log if a comment is provided
  if (finalComment) {
    const logs = await TimeLog.findAll({
      where: { ticket_id: ticketId, log_type: { [Op.ne]: 'final' } },
      attributes: ['hours'],
      raw: true,
    });

    const totalHours = (logs as unknown as { hours: number }[]).reduce(
      (sum, l) => sum + parseFloat(String(l.hours ?? 0)),
      0,
    );

    await TimeLog.create({
      ticket_id:      ticketId,
      user_id:        userId,
      hours:          Number(totalHours.toFixed(2)),
      comment:        finalComment,
      log_type:       'final',
      revision_cycle: c.revision_count ?? 0,
    });
  }

  return Ticket.findByPk(ticketId, { raw: true });
}
