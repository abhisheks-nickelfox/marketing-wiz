import logger from '../../config/logger';
import { Op, QueryTypes } from 'sequelize';
import type { Task } from '../../types';
import sequelize from '../../config/database';
import { Ticket, Firm, User, Project, TimeLog, TimeEntry, Notification, TaskAssignee, ProjectMember } from '../../models';
import {
  STATUS_PRIORITY,
  VALID_TRANSITIONS,
  PAST_DEADLINE_STATUSES,
  STALE_APPROVED_DAYS,
} from '../../config/constants';
import { sendUrgentTaskEmail } from '../../services/email.service';
import { postSystemMessage } from '../messages/messages.service';

// ── Types ────────────────────────────────────────────────────────────────────

export interface CreateTaskDto {
  firm_id:         string;
  title:           string;
  /** Legacy column — defaults to 'task'. Use task_type_id for custom types. */
  type?:           string;
  /** UUID of the task_types catalog entry. Saved to tickets.task_type_id. */
  task_type_id?:   string;
  priority?:       'low' | 'normal' | 'high' | 'urgent';
  description?:    string;
  project_id?:     string;
  assignee_id?:    string;
  assignee_ids?:   string[];
  deadline?:       string;
  estimated_hours?: number;
  initial_status?: string;
  /** UUID of the parent task. When provided, this task becomes a sub-task. */
  parent_task_id?: string;
}

export interface UpdateTaskDto {
  title?:           string;
  description?:     string;
  type?:            string;
  priority?:        string;
  change_note?:     string;
  estimated_hours?: number;
  assignee_id?:     string | null;
  assignee_ids?:    string[] | null;
  deadline?:        string | null;
  project_id?:      string | null;
}

export interface AssignApproveDto {
  assignee_id:  string;
  priority?:    string;
  deadline?:    string;
  project_id?:  string;
}

// ── Helper: sync task_assignees table ────────────────────────────────────────

async function syncTaskAssignees(taskId: string, assigneeIds: string[]): Promise<void> {
  // Remove all existing rows for this task not in new list
  const where: Record<string, unknown> = { task_id: taskId };
  if (assigneeIds.length > 0) {
    where.user_id = { [Op.notIn]: assigneeIds };
  }
  await TaskAssignee.destroy({ where });

  if (assigneeIds.length === 0) return;

  const rows = assigneeIds.map((user_id) => ({ task_id: taskId, user_id }));
  await TaskAssignee.bulkCreate(rows, { ignoreDuplicates: true });
}

async function fetchTaskAssignees(taskId: string): Promise<{ id: string; name: string; email: string; avatar_url: string | null }[]> {
  const rows = await TaskAssignee.findAll({
    where: { task_id: taskId },
    include: [{ model: User, as: 'user', attributes: ['name', 'email', 'avatar_url'], required: true }],
    raw: true,
  });

  // raw:true + include produces flat dot-notation keys: 'user.name', 'user.email', etc.
  return (rows as unknown as { user_id: string; 'user.name': string; 'user.email': string; 'user.avatar_url': string | null }[]).map((r) => ({
    id:         r.user_id,
    name:       r['user.name']       ?? '',
    email:      r['user.email']      ?? '',
    avatar_url: r['user.avatar_url'] ?? null,
  }));
}

// ── Helper: ensure task assignees are project members ────────────────────────

async function syncAssigneesToProjectMembers(projectId: string, assigneeIds: string[]): Promise<void> {
  if (!projectId || assigneeIds.length === 0) return;
  const rows = assigneeIds.map((user_id) => ({ project_id: projectId, user_id }));
  await ProjectMember.bulkCreate(rows, { ignoreDuplicates: true });
}

// ── Helper: assignee condition that covers both primary + junction assignees ──

async function assigneeCondition(userId: string): Promise<Record<string, unknown>> {
  const taRows = await TaskAssignee.findAll({
    where: { user_id: userId },
    attributes: ['task_id'],
    raw: true,
  });
  const junctionIds = (taRows as unknown as { task_id: string }[]).map((r) => r.task_id);
  if (junctionIds.length === 0) return { assignee_id: userId };
  return {
    [Op.or as unknown as string]: [
      { assignee_id: userId },
      { id: { [Op.in]: junctionIds } },
    ],
  };
}

// ── Helper: get member IDs for a project ─────────────────────────────────────

async function getProjectMemberIds(projectId: string): Promise<string[]> {
  const rows = await ProjectMember.findAll({
    where: { project_id: projectId },
    attributes: ['user_id'],
    raw: true,
  });
  return (rows as unknown as { user_id: string }[]).map((r) => r.user_id);
}

// ── Service methods ──────────────────────────────────────────────────────────

export interface PaginatedTasksResult {
  data:  (Task & Record<string, unknown>)[];
  total: number;
  page:  number;
  limit: number;
}

export async function findAllTasks(options: {
  userId:           string;
  userRole:         string;
  userPermissions:  string[];
  filters:          Record<string, string>;
}): Promise<PaginatedTasksResult> {
  const { userId, userRole, userPermissions, filters } = options;

  // ── Pagination params ──────────────────────────────────────────────────────
  const DEFAULT_LIMIT = 50;
  const MAX_LIMIT     = 100;
  const page  = Math.max(1, parseInt(filters.page  ?? '1',  10) || 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(filters.limit ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT));
  const offset = (page - 1) * limit;

  const canViewAll =
    userRole === 'admin' ||
    userPermissions.includes('view_all_tickets');

  // Build WHERE clause
  const where: Record<string, unknown> = {
    // Only return top-level tasks in list responses.
    // Sub-tasks are nested inside their parent's `subtasks` array.
    parent_task_id: null,
  };

  if (!canViewAll) {
    Object.assign(where, await assigneeCondition(userId));
    where.archived = false;
  } else {
    const { firm_id, assignee_id, status, type, priority, archived, project_id, overdue, session_id } = filters;

    if (firm_id) where.firm_id = firm_id;
    if (assignee_id) Object.assign(where, await assigneeCondition(assignee_id));
    if (type)        where.type        = type;
    if (priority)    where.priority    = priority;
    if (project_id)  where.project_id  = project_id;
    if (session_id)  where.session_id  = session_id;

    if (overdue === 'true') {
      const today          = new Date().toISOString().split('T')[0];
      const staleThreshold = new Date(Date.now() - STALE_APPROVED_DAYS * 24 * 60 * 60 * 1000);
      where.archived       = false;
      where[Op.or as unknown as string] = [
        {
          deadline: { [Op.lt]: today },
          status:   { [Op.in]: [...PAST_DEADLINE_STATUSES] as string[] },
        },
        {
          status:     'assigned',
          deadline:   null,
          updated_at: { [Op.lt]: staleThreshold },
        },
      ];
    } else {
      if (status) where.status = status;
      where.archived = archived === 'true' ? true : false;
    }
  }

  // Run count and paginated fetch concurrently — count uses the same WHERE clause
  const [totalCount, rows] = await Promise.all([
    Ticket.count({ where }),
    Ticket.findAll({
      where,
      order:  [['updated_at', 'DESC']],
      limit,
      offset,
      raw: true,
    }),
  ]);

  if (rows.length === 0) {
    return { data: [], total: totalCount, page, limit };
  }

  const ticketList  = rows as unknown as Record<string, unknown>[];
  const ticketIds   = ticketList.map((t) => t.id as string);
  const firmIds     = [...new Set(ticketList.map((t) => t.firm_id as string).filter(Boolean))];
  const projectIds  = [...new Set(ticketList.map((t) => t.project_id as string).filter(Boolean))];
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

  // Batch: primary assignee details
  const assigneeMap: Record<string, { name: string; email: string }> = {};
  if (assigneeIds.length > 0) {
    const assignees = await User.findAll({ where: { id: { [Op.in]: assigneeIds } }, attributes: ['id', 'name', 'email'], raw: true });
    for (const u of assignees as unknown as { id: string; name: string; email: string }[]) assigneeMap[u.id] = { name: u.name, email: u.email };
  }

  // Batch: time entries (completed only — running timers have no duration yet)
  const timeMap: Record<string, number> = {};
  if (ticketIds.length > 0) {
    const entries = await TimeEntry.findAll({
      where: { task_id: { [Op.in]: ticketIds }, is_running: false },
      attributes: ['task_id', 'duration_seconds'],
      raw: true,
    });
    for (const e of entries as unknown as { task_id: string; duration_seconds: number | null }[]) {
      // Convert seconds to hours for display consistency (stored as seconds in time_entries)
      timeMap[e.task_id] = (timeMap[e.task_id] ?? 0) + ((e.duration_seconds ?? 0) / 3600);
    }
  }

  // Batch: all task assignees
  // raw:true + include returns flat dot-notation keys: 'user.name', 'user.email', 'user.avatar_url'
  const taskAssigneeMap: Record<string, { id: string; name: string; email: string; avatar_url: string | null }[]> = {};
  if (ticketIds.length > 0) {
    const taRows = await TaskAssignee.findAll({
      where: { task_id: { [Op.in]: ticketIds } },
      include: [{ model: User, as: 'user', attributes: ['name', 'email', 'avatar_url'], required: true }],
      raw: true,
    });
    for (const row of taRows) {
      const r = row as unknown as { task_id: string; user_id: string; 'user.name': string; 'user.email': string; 'user.avatar_url': string | null };
      if (!taskAssigneeMap[r.task_id]) taskAssigneeMap[r.task_id] = [];
      taskAssigneeMap[r.task_id].push({ id: r.user_id, name: r['user.name'] ?? '', email: r['user.email'] ?? '', avatar_url: r['user.avatar_url'] ?? null });
    }
  }

  // Batch: direct sub-tasks for all returned top-level tasks
  // Sub-tasks are fetched in a single query grouped by parent_task_id.
  const subtaskMap: Record<string, Record<string, unknown>[]> = {};
  if (ticketIds.length > 0) {
    const subtaskRows = await Ticket.findAll({
      where: { parent_task_id: { [Op.in]: ticketIds } },
      order: [['created_at', 'ASC']],
      raw: true,
    });

    const subtaskList = subtaskRows as unknown as Record<string, unknown>[];

    if (subtaskList.length > 0) {
      // Enrich sub-tasks with their assignees (single batch query)
      const subtaskIds = subtaskList.map((s) => s.id as string);
      const subtaskAssigneeMap: Record<string, { id: string; name: string; email: string; avatar_url: string | null }[]> = {};

      const stRows = await TaskAssignee.findAll({
        where: { task_id: { [Op.in]: subtaskIds } },
        include: [{ model: User, as: 'user', attributes: ['name', 'email', 'avatar_url'], required: true }],
        raw: true,
      });
      for (const row of stRows) {
        const r = row as unknown as { task_id: string; user_id: string; 'user.name': string; 'user.email': string; 'user.avatar_url': string | null };
        if (!subtaskAssigneeMap[r.task_id]) subtaskAssigneeMap[r.task_id] = [];
        subtaskAssigneeMap[r.task_id].push({ id: r.user_id, name: r['user.name'] ?? '', email: r['user.email'] ?? '', avatar_url: r['user.avatar_url'] ?? null });
      }

      for (const s of subtaskList) {
        const parentId = s.parent_task_id as string;
        if (!subtaskMap[parentId]) subtaskMap[parentId] = [];
        subtaskMap[parentId].push({
          ...s,
          assignees: subtaskAssigneeMap[s.id as string] ?? [],
        });
      }
    }
  }

  const enriched = ticketList.map((t) => {
    const aid = t.assignee_id as string | null;
    const pid = t.project_id  as string | null;
    return {
      ...t,
      firms:      t.firm_id ? { name: firmMap[t.firm_id as string] ?? null } : null,
      assignee:   aid ? assigneeMap[aid] ?? null : null,
      assignees:  taskAssigneeMap[t.id as string] ?? [],
      project:    pid ? { name: projectMap[pid] ?? null } : null,
      time_spent: Number((timeMap[t.id as string] ?? 0).toFixed(2)),
      subtasks:   subtaskMap[t.id as string] ?? [],
    };
  });

  // Sort by status priority, then most-recently-updated
  (enriched as unknown as Record<string, unknown>[]).sort((a, b) => {
    const pa = STATUS_PRIORITY[a['status'] as string] ?? 99;
    const pb = STATUS_PRIORITY[b['status'] as string] ?? 99;
    if (pa !== pb) return pa - pb;
    return new Date(b['updated_at'] as string).getTime() - new Date(a['updated_at'] as string).getTime();
  });

  return { data: enriched as unknown as (Task & Record<string, unknown>)[], total: totalCount, page, limit };
}

export async function findTaskById(id: string): Promise<(Task & Record<string, unknown>) | null> {
  const task = await Ticket.findByPk(id, { raw: true });
  if (!task) return null;

  const t = task as unknown as Record<string, unknown>;

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

  const assignees = await fetchTaskAssignees(id);

  // Fetch direct sub-tasks (only for top-level tasks)
  let subtasks: unknown[] = [];
  if (!t.parent_task_id) {
    const subRows = await Ticket.findAll({
      where: { parent_task_id: id },
      order: [['created_at', 'ASC']],
      raw: true,
    });
    if (subRows.length > 0) {
      const subList    = subRows as unknown as Record<string, unknown>[];
      const subIds     = subList.map((s) => s.id as string);
      const subAssigneeMap: Record<string, { id: string; name: string; email: string; avatar_url: string | null }[]> = {};
      const taRows = await TaskAssignee.findAll({
        where: { task_id: { [Op.in]: subIds } },
        include: [{ model: User, as: 'user', attributes: ['name', 'email', 'avatar_url'], required: true }],
        raw: true,
      });
      for (const row of taRows) {
        const r = row as unknown as { task_id: string; user_id: string; 'user.name': string; 'user.email': string; 'user.avatar_url': string | null };
        if (!subAssigneeMap[r.task_id]) subAssigneeMap[r.task_id] = [];
        subAssigneeMap[r.task_id].push({ id: r.user_id, name: r['user.name'] ?? '', email: r['user.email'] ?? '', avatar_url: r['user.avatar_url'] ?? null });
      }
      subtasks = subList.map((s) => ({ ...s, assignees: subAssigneeMap[s.id as string] ?? [] }));
    }
  }

  return { ...t, firms, assignee, assignees, subtasks } as unknown as (Task & Record<string, unknown>);
}

/**
 * Returns all direct sub-tasks for a given parent task ID.
 * Each sub-task is enriched with its assignees array.
 * Returns 404-throwing null when the parent does not exist.
 */
export async function getSubTasks(parentId: string): Promise<unknown[] | null> {
  // Verify the parent task exists before querying sub-tasks
  const parent = await Ticket.findByPk(parentId, { attributes: ['id'], raw: true });
  if (!parent) return null;

  const rows = await Ticket.findAll({
    where: { parent_task_id: parentId },
    order: [['created_at', 'ASC']],
    raw: true,
  });

  if (rows.length === 0) return [];

  const subtaskList = rows as unknown as Record<string, unknown>[];
  const subtaskIds  = subtaskList.map((s) => s.id as string);

  // Batch-fetch assignees for all sub-tasks in a single query
  const subtaskAssigneeMap: Record<string, { id: string; name: string; email: string; avatar_url: string | null }[]> = {};
  const taRows = await TaskAssignee.findAll({
    where: { task_id: { [Op.in]: subtaskIds } },
    include: [{ model: User, as: 'user', attributes: ['name', 'email', 'avatar_url'], required: true }],
    raw: true,
  });
  for (const row of taRows) {
    const r = row as unknown as { task_id: string; user_id: string; 'user.name': string; 'user.email': string; 'user.avatar_url': string | null };
    if (!subtaskAssigneeMap[r.task_id]) subtaskAssigneeMap[r.task_id] = [];
    subtaskAssigneeMap[r.task_id].push({
      id:         r.user_id,
      name:       r['user.name']       ?? '',
      email:      r['user.email']      ?? '',
      avatar_url: r['user.avatar_url'] ?? null,
    });
  }

  return subtaskList.map((s) => ({
    ...s,
    assignees: subtaskAssigneeMap[s.id as string] ?? [],
  }));
}

const LEGACY_TYPES = ['task', 'design', 'development', 'account_management'] as const;

export async function createTask(dto: CreateTaskDto): Promise<unknown> {
  const { firm_id, title, priority = 'normal', description,
          task_type_id, project_id, assignee_id, assignee_ids, deadline,
          estimated_hours, initial_status, parent_task_id } = dto;

  // Normalize type: use provided value only if it's a legacy DB-valid value,
  // otherwise default to 'task'. task_type_id carries the real type going forward.
  const type = (LEGACY_TYPES as readonly string[]).includes(dto.type ?? '')
    ? dto.type!
    : 'task';

  const firm = await Firm.findByPk(firm_id, { attributes: ['id'], raw: true });
  if (!firm) {
    throw Object.assign(new Error('Firm not found'), { statusCode: 404 });
  }

  // Validate parent task exists and belongs to the same firm when provided
  if (parent_task_id) {
    const parent = await Ticket.findByPk(parent_task_id, {
      attributes: ['id', 'firm_id', 'parent_task_id'],
      raw: true,
    });
    if (!parent) {
      throw Object.assign(new Error('Parent task not found'), { statusCode: 404 });
    }
    const p = parent as unknown as { id: string; firm_id: string; parent_task_id: string | null };
    if (p.firm_id !== firm_id) {
      throw Object.assign(new Error('Parent task does not belong to the same firm'), { statusCode: 400 });
    }
    // Prevent nesting beyond one level: a sub-task cannot itself be a sub-task
    if (p.parent_task_id !== null) {
      throw Object.assign(new Error('Cannot create a sub-task of a sub-task (nesting limited to one level)'), { statusCode: 400 });
    }
  }

  // Resolve primary assignee: first of assignee_ids, or explicit assignee_id
  const effectiveAssigneeIds = assignee_ids?.filter(Boolean) ?? (assignee_id ? [assignee_id] : []);
  const primaryAssigneeId: string | null = effectiveAssigneeIds[0] ?? null;

  // Auto-set status to 'assigned' when an assignee is provided
  let effectiveStatus = initial_status ?? 'to_do';
  if (primaryAssigneeId && effectiveStatus === 'to_do') {
    effectiveStatus = 'assigned';
  }

  const ticket = await Ticket.create({
    firm_id,
    title:           title.trim(),
    type,
    task_type_id:    task_type_id ?? null,
    priority,
    description:     description?.trim() ?? '',
    session_id:      null,
    ai_generated:    false,
    status:          effectiveStatus,
    assignee_id:     primaryAssigneeId,
    project_id:      project_id ?? null,
    deadline:        deadline   ?? null,
    estimated_hours: estimated_hours ?? null,
    edited:          false,
    change_note:     '',
    parent_task_id:  parent_task_id ?? null,
  });

  if (effectiveAssigneeIds.length > 0) {
    await syncTaskAssignees(ticket.id, effectiveAssigneeIds);
  }

  const assignees = await fetchTaskAssignees(ticket.id);
  return { ...ticket.toJSON(), assignees };
}

// ── Completion guards ─────────────────────────────────────────────────────────

/** Throws 400 if any direct sub-task of `taskId` is not completed. */
async function assertSubTasksCompleted(taskId: string): Promise<void> {
  const incomplete = await Ticket.findAll({
    where: { parent_task_id: taskId, status: { [Op.ne]: 'completed' } },
    attributes: ['id'],
    raw: true,
    limit: 1,
  });
  if (incomplete.length > 0) {
    throw Object.assign(
      new Error('All sub-tasks must be completed before completing this task'),
      { statusCode: 400 },
    );
  }
}

/**
 * After a task is completed, auto-complete the project if ALL parent tasks
 * in the project are now completed.
 */
async function maybeAutoCompleteProject(taskId: string): Promise<void> {
  const task = await Ticket.findByPk(taskId, { attributes: ['project_id'], raw: true });
  const projectId = (task as unknown as { project_id: string | null } | null)?.project_id;
  if (!projectId) return;

  const incomplete = await Ticket.findAll({
    where: {
      project_id:     projectId,
      parent_task_id: null,
      status:         { [Op.ne]: 'completed' },
      archived:       false,
    },
    attributes: ['id'],
    raw: true,
    limit: 1,
  });

  if (incomplete.length === 0) {
    await Project.update(
      { workflow_status: 'completed', updated_at: new Date().toISOString() },
      { where: { id: projectId } },
    );
  }
}

/**
 * Sends inbox notification + email to every current assignee of a task
 * when its priority has been set to 'urgent'.
 * Fire-and-forget — errors are logged but never bubble up.
 */
async function notifyUrgentTaskAssignees(taskId: string, taskTitle: string): Promise<void> {
  try {
    // Fetch junction assignees and primary assignee_id from the ticket concurrently
    const [assigneeRows, ticket] = await Promise.all([
      TaskAssignee.findAll({
        where: { task_id: taskId },
        include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'], required: true }],
        raw: true,
      }),
      Ticket.findByPk(taskId, { attributes: ['assignee_id'], raw: true }),
    ]);

    const notified = new Set<string>();
    const targets: { id: string; name: string; email: string }[] = [];

    // raw:true + include returns flat dot-notation keys
    for (const row of assigneeRows as unknown as { user_id: string; 'user.id': string; 'user.name': string; 'user.email': string }[]) {
      if (!notified.has(row.user_id)) {
        notified.add(row.user_id);
        targets.push({ id: row['user.id'], name: row['user.name'], email: row['user.email'] });
      }
    }

    // Fallback: include primary assignee_id from ticket itself when not already in junction table
    const primaryId = (ticket as unknown as { assignee_id: string | null } | null)?.assignee_id;
    if (primaryId && !notified.has(primaryId)) {
      const user = await User.findByPk(primaryId, { attributes: ['id', 'name', 'email'], raw: true });
      if (user) {
        const u = user as unknown as { id: string; name: string; email: string };
        targets.push({ id: u.id, name: u.name, email: u.email });
      }
    }

    if (targets.length === 0) return;

    logger.info(`[tasks.service] notifying ${targets.length} assignee(s) of urgent task "${taskTitle}"`);

    // Create all inbox notifications in a single bulk insert
    await Notification.bulkCreate(
      targets.map(({ id: userId }) => ({
        user_id:   userId,
        title:     'Urgent task assigned to you',
        message:   `"${taskTitle}" has been marked as Urgent. Please review it immediately.`,
        ticket_id: taskId,
        read:      false,
        type:      'urgent',
      })),
    ).catch((err) => logger.error('[tasks.service] urgent inbox notification bulkCreate error:', err));

    // Send all email notifications concurrently; individual failures do not block others
    await Promise.all(
      targets.map(({ name, email }) =>
        sendUrgentTaskEmail(email, name, taskTitle, taskId)
          .catch((err) => logger.error('[tasks.service] urgent email error:', err)),
      ),
    );
  } catch (err) {
    logger.error('[tasks.service] notifyUrgentTaskAssignees error:', err);
  }
}

export async function updateTask(
  id: string,
  updates: Record<string, unknown>,
  actorId?: string,
): Promise<unknown | null> {
  const current = await Ticket.findByPk(id, { attributes: ['status', 'project_id', 'priority', 'title'], raw: true });
  const currentStatus    = (current as unknown as { status: string; project_id: string | null; priority: string; title: string } | null)?.status    ?? '';
  const currentProjectId = (current as unknown as { status: string; project_id: string | null; priority: string; title: string } | null)?.project_id ?? null;
  const currentPriority  = (current as unknown as { status: string; project_id: string | null; priority: string; title: string } | null)?.priority  ?? '';
  const currentTitle     = (current as unknown as { status: string; project_id: string | null; priority: string; title: string } | null)?.title     ?? '';

  // ── Project move: cascade to sub-tasks ───────────────────────────────────
  // When a parent task moves, all its sub-tasks move with it (project_id updated).
  // Task assignees and project members are independent — moving a task never
  // touches project_members in either direction.
  const newProjectId = 'project_id' in updates ? (updates.project_id as string | null) : undefined;
  if (newProjectId !== undefined && newProjectId !== currentProjectId && newProjectId) {
    await Ticket.update({ project_id: newProjectId }, { where: { parent_task_id: id } });
  }

  // ── Assignee sync ─────────────────────────────────────────────────────────
  // Task assignees are task-level only — do NOT mirror them into project_members.
  if ('assignee_ids' in updates) {
    const newIds = (updates.assignee_ids as string[] | null) ?? [];

    if (newIds.length > 0 && currentStatus === 'to_do') updates.status = 'assigned';
    if (newIds.length === 0 && currentStatus === 'assigned') updates.status = 'to_do';

    // Detect adds/removes for activity log before syncing
    if (actorId) {
      const oldAssignees = await fetchTaskAssignees(id);
      const oldIds = oldAssignees.map((a) => a.id);
      const added   = newIds.filter((uid) => !oldIds.includes(uid));
      const removed = oldAssignees.filter((a) => !newIds.includes(a.id));

      if (added.length > 0 || removed.length > 0) {
        const newUsers = added.length > 0
          ? await User.findAll({ where: { id: { [Op.in]: added } }, attributes: ['id', 'name'], raw: true }) as unknown as { id: string; name: string }[]
          : [];
        const newUserMap: Record<string, string> = {};
        for (const u of newUsers) newUserMap[u.id] = u.name;

        await Promise.all([
          ...added.map((uid) =>
            postSystemMessage('task', id, actorId, `assigned ${newUserMap[uid] ?? 'a member'} to this task`).catch(() => {}),
          ),
          ...removed.map((a) =>
            postSystemMessage('task', id, actorId, `removed ${a.name} from this task`).catch(() => {}),
          ),
        ]);
      }
    }

    await syncTaskAssignees(id, newIds);
    updates.assignee_id = newIds[0] ?? null;
    delete updates.assignee_ids;
  } else if ('assignee_id' in updates) {
    const newId = updates.assignee_id as string | null;

    if (newId && currentStatus === 'to_do') updates.status = 'assigned';
    if (!newId && currentStatus === 'assigned') updates.status = 'to_do';

    // Post activity log for single-assignee change
    if (actorId) {
      const oldAssignees = await fetchTaskAssignees(id);
      const oldIds = oldAssignees.map((a) => a.id);
      if (newId && !oldIds.includes(newId)) {
        const u = await User.findByPk(newId, { attributes: ['name'], raw: true }) as unknown as { name: string } | null;
        postSystemMessage('task', id, actorId, `assigned ${u?.name ?? 'a member'} to this task`).catch(() => {});
      }
      for (const a of oldAssignees) {
        if (!newId || a.id !== newId) {
          postSystemMessage('task', id, actorId, `removed ${a.name} from this task`).catch(() => {});
        }
      }
    }

    await syncTaskAssignees(id, newId ? [newId] : []);
  }

  if (updates.status === 'completed' && currentStatus !== 'completed') {
    await assertSubTasksCompleted(id);
  }

  await Ticket.update(updates, { where: { id } });

  if (updates.status === 'completed' && currentStatus !== 'completed') {
    await maybeAutoCompleteProject(id).catch((err) =>
      logger.error('[tasks.service] maybeAutoCompleteProject error:', err),
    );
  }

  // Notify assignees when priority is escalated to urgent
  if (updates.priority === 'urgent' && currentPriority !== 'urgent') {
    const taskTitle = (updates.title as string | undefined) ?? currentTitle;
    notifyUrgentTaskAssignees(id, taskTitle);
  }

  const row       = await Ticket.findByPk(id, { raw: true });
  const assignees = await fetchTaskAssignees(id);
  return row ? { ...(row as unknown as object), assignees } : null;
}

export async function findRawTask(id: string): Promise<Record<string, unknown> | null> {
  const row = await Ticket.findByPk(id, { raw: true });
  return row ? (row as unknown as Record<string, unknown>) : null;
}

export async function assignAndApproveTask(
  id: string,
  dto: AssignApproveDto,
  actorId?: string,
): Promise<unknown | null> {
  const { assignee_id, priority, deadline, project_id } = dto;

  const assignee = await User.findByPk(assignee_id, { attributes: ['id', 'name'], raw: true }) as unknown as { id: string; name: string } | null;
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

  const [count] = await Ticket.update(updatePayload, {
    where: { id, status: 'to_do' },
  });

  if (count === 0) return null;

  await syncTaskAssignees(id, [assignee_id]);

  const updated = await Ticket.findByPk(id, { raw: true });
  if (!updated) return null;

  const t = updated as unknown as Record<string, unknown>;

  await Notification.create({
    user_id:   assignee_id,
    title:     'New task assigned',
    message:   t.title as string,
    ticket_id: t.id as string,
    read:      false,
  });

  if (actorId) {
    postSystemMessage('task', id, actorId, `assigned ${assignee.name} to this task`).catch(() => {});
  }

  const assignees = await fetchTaskAssignees(id);
  return { ...t, assignees };
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
  await TaskAssignee.destroy({ where: { task_id: id } });
  await Ticket.destroy({ where: { id } });
}

export async function archiveTask(id: string, archived: boolean): Promise<unknown | null> {
  await Ticket.update({ archived }, { where: { id } });
  return Ticket.findByPk(id, { raw: true });
}

export async function transitionTask(options: {
  ticketId:     string;
  targetStatus: string;
  changeNote?:  string;
  userId:       string;
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

  if (targetStatus === 'completed') {
    await assertSubTasksCompleted(ticketId);
  }

  const updates: Record<string, unknown> = {
    status:     targetStatus,
    updated_at: new Date().toISOString(),
  };
  if (changeNote !== undefined) updates.change_note = changeNote;
  if (targetStatus === 'to_do')     updates.assignee_id    = null;
  if (targetStatus === 'revisions') updates.revision_count = (c.revision_count ?? 0) + 1;

  await Ticket.update(updates, { where: { id: ticketId } });

  // Clear assignees when transitioning back to to_do
  if (targetStatus === 'to_do') {
    await syncTaskAssignees(ticketId, []);
  }

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
    const statusLabel = c.status.replace(/_/g, ' ');
    postSystemMessage('task', ticketId, userId, `changed status: ${statusLabel} → Revisions`).catch(() => {});
  } else {
    await TimeLog.create({
      ticket_id:      ticketId,
      user_id:        userId,
      hours:          0,
      comment:        targetStatus,
      log_type:       'transition',
      revision_cycle: c.revision_count ?? 0,
    }).catch((err) => logger.error('[tasks.service] Failed to insert transition log:', err));
    const fromLabel = c.status.replace(/_/g, ' ');
    const toLabel   = targetStatus.replace(/_/g, ' ');
    postSystemMessage('task', ticketId, userId, `changed status: ${fromLabel} → ${toLabel}`).catch(() => {});
  }

  const result = await Ticket.findByPk(ticketId, { raw: true });

  if (targetStatus === 'completed') {
    await maybeAutoCompleteProject(ticketId).catch((err) =>
      logger.error('[tasks.service] maybeAutoCompleteProject error:', err),
    );
  }

  return result;
}

export async function resolveTask(options: {
  ticketId:       string;
  userId:         string;
  finalComment?:  string;
  estimatedHours?: number;
}): Promise<unknown | null> {
  const { ticketId, userId, finalComment, estimatedHours } = options;

  const current = await Ticket.findByPk(ticketId, {
    attributes: ['id', 'assignee_id', 'status', 'revision_count'],
    raw: true,
  });

  if (!current) return null;

  const c = current as unknown as { id: string; assignee_id: string; status: string; revision_count: number };

  await assertSubTasksCompleted(ticketId);

  const updates: Record<string, unknown> = {
    status:     'completed',
    updated_at: new Date().toISOString(),
  };
  if (estimatedHours !== undefined) updates.estimated_hours = estimatedHours;

  await Ticket.update(updates, { where: { id: ticketId } });

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

  const resolved = await Ticket.findByPk(ticketId, { raw: true });

  await maybeAutoCompleteProject(ticketId).catch((err) =>
    logger.error('[tasks.service] maybeAutoCompleteProject error:', err),
  );

  return resolved;
}

