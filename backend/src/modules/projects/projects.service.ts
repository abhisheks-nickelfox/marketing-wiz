import { randomUUID } from 'crypto';
import logger from '../../config/logger';
import { Op, QueryTypes, UniqueConstraintError } from 'sequelize';
import sequelize from '../../config/database';
import { Project, Firm, Ticket, TimeEntry, ProjectMember, User } from '../../models';
import type { CreateProjectDto } from './dto/create-project.dto';
import type { UpdateProjectDto } from './dto/update-project.dto';
import { postSystemMessage } from '../messages/messages.service';

// ── Types ─────────────────────────────────────────────────────────────────────

export type WorkflowStatus = 'todo' | 'in_progress' | 'in_review' | 'approved' | 'completed';

export interface ProjectRow {
  id:              string;
  firm_id:         string;
  name:            string;
  description:     string | null;
  status:          'active' | 'archived';
  workflow_status: WorkflowStatus;
  start_date:      string | null;
  end_date:        string | null;
  priority:        'high' | 'medium' | 'low';
  share_token:     string | null;
  created_at:      string;
  updated_at:      string;
}

export interface ProjectMemberRow {
  id:         string;
  name:       string;
  email:      string;
  avatar_url: string | null;
  added_at:   string;
}

export interface ProjectWithStats extends ProjectRow {
  firm_name:    string | null;
  ticket_count: number;
  members:      ProjectMemberRow[];
}

export interface TaskSummary {
  id:          string;
  title:       string;
  status:      string;
  priority:    string;
  assignee_id: string | null;
  deadline:    string | null;
  project_id:  string | null;
  time_spent:  number;
}

export interface ProjectOverview extends ProjectWithStats {
  tasks_by_status: Record<string, TaskSummary[]>;
  task_totals: {
    total:     number;
    todo:      number;
    progress:  number;
    review:    number;
    completed: number;
    blocked:   number;
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function fetchMembers(projectId: string): Promise<ProjectMemberRow[]> {
  const rows = await ProjectMember.findAll({
    where: { project_id: projectId },
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['name', 'email', 'avatar_url'],
        required: true,
      },
    ],
    order: [['added_at', 'ASC']],
    raw: false,
  });

  return rows.map((row) => {
    const r = row as unknown as { user_id: string; added_at: string; user: { name: string; email: string; avatar_url: string | null } };
    return {
      id:         r.user_id,
      name:       r.user?.name  ?? '',
      email:      r.user?.email ?? '',
      avatar_url: r.user?.avatar_url ?? null,
      added_at:   r.added_at,
    };
  });
}

async function syncMembers(projectId: string, memberIds: string[]): Promise<void> {
  // Delete members not in new list
  const where: Record<string, unknown> = { project_id: projectId };
  if (memberIds.length > 0) {
    where.user_id = { [Op.notIn]: memberIds };
  }
  await ProjectMember.destroy({ where });

  if (memberIds.length === 0) return;

  // Upsert new members (ignore duplicates via ignoreDuplicates)
  const rows = memberIds.map((user_id) => ({ project_id: projectId, user_id }));
  await ProjectMember.bulkCreate(rows, { ignoreDuplicates: true });
}

// ── Service methods ───────────────────────────────────────────────────────────

export async function findAllProjects(firmId?: string): Promise<ProjectWithStats[]> {
  const where: Record<string, unknown> = {};
  if (firmId) where.firm_id = firmId;

  const projects = await Project.findAll({
    where,
    order: [['created_at', 'DESC']],
    raw: true,
  });

  if (projects.length === 0) return [];

  const projectList = projects as unknown as ProjectRow[];
  const projectIds  = projectList.map((p) => p.id);
  const firmIds     = [...new Set(projectList.map((p) => p.firm_id).filter(Boolean))];

  // Batch: firm names
  const firmMap: Record<string, string> = {};
  if (firmIds.length > 0) {
    const firms = await Firm.findAll({ where: { id: { [Op.in]: firmIds } }, attributes: ['id', 'name'], raw: true });
    for (const f of firms as unknown as { id: string; name: string }[]) firmMap[f.id] = f.name;
  }

  // Batch: ticket counts
  const ticketCountMap: Record<string, number> = {};
  if (projectIds.length > 0) {
    const ticketRows = await Ticket.findAll({
      where: { project_id: { [Op.in]: projectIds } },
      attributes: ['project_id'],
      raw: true,
    });
    for (const r of ticketRows as unknown as { project_id: string }[]) {
      ticketCountMap[r.project_id] = (ticketCountMap[r.project_id] ?? 0) + 1;
    }
  }

  // Batch: project members
  const memberRows = await ProjectMember.findAll({
    where: { project_id: { [Op.in]: projectIds } },
    include: [{ model: User, as: 'user', attributes: ['name', 'email', 'avatar_url'], required: true }],
    raw: false,
  });

  const memberMap: Record<string, ProjectMemberRow[]> = {};
  for (const row of memberRows) {
    const r = row as unknown as { project_id: string; user_id: string; added_at: string; user: { name: string; email: string; avatar_url: string | null } };
    if (!memberMap[r.project_id]) memberMap[r.project_id] = [];
    memberMap[r.project_id].push({
      id:         r.user_id,
      name:       r.user?.name  ?? '',
      email:      r.user?.email ?? '',
      avatar_url: r.user?.avatar_url ?? null,
      added_at:   r.added_at,
    });
  }

  return projectList.map((p) => ({
    ...p,
    firm_name:    firmMap[p.firm_id] ?? null,
    ticket_count: ticketCountMap[p.id] ?? 0,
    members:      memberMap[p.id]      ?? [],
  }));
}

export async function findProjectById(id: string): Promise<ProjectWithStats | null> {
  const project = await Project.findByPk(id, { raw: true });
  if (!project) return null;

  const p = project as unknown as ProjectRow;

  const [firmRow, ticketCount, members] = await Promise.all([
    Firm.findByPk(p.firm_id, { attributes: ['name'], raw: true }),
    Ticket.count({ where: { project_id: id } }),
    fetchMembers(id),
  ]);

  return {
    ...p,
    firm_name:    (firmRow as unknown as { name: string } | null)?.name ?? null,
    ticket_count: ticketCount,
    members,
  };
}

export async function getProjectOverview(id: string): Promise<ProjectOverview | null> {
  const base = await findProjectById(id);
  if (!base) return null;

  // Fetch tasks and time entries concurrently — they are independent of each other.
  // Time entries are fetched for the entire project in a single query keyed by task_id,
  // so we don't need the task list first. Both queries run in parallel.
  // Fetch task IDs for the parameterized time-entry sub-query.
  // Using a separate query avoids string interpolation inside a SQL literal.
  const taskIdRows = await sequelize.query<{ id: string }>(
    'SELECT id FROM tickets WHERE project_id = :projectId AND archived = false',
    { replacements: { projectId: id }, type: QueryTypes.SELECT },
  );
  const projectTaskIds = taskIdRows.map((r) => r.id);

  const [projectTasks, allProjectEntries] = await Promise.all([
    Ticket.findAll({
      where: { project_id: id, archived: false },
      attributes: ['id', 'title', 'status', 'priority', 'assignee_id', 'deadline', 'project_id'],
      order: [['updated_at', 'DESC']],
      raw: true,
    }),
    projectTaskIds.length > 0
      ? TimeEntry.findAll({
          where: { task_id: { [Op.in]: projectTaskIds }, is_running: false },
          attributes: ['task_id', 'duration_seconds'],
          raw: true,
        })
      : Promise.resolve([]),
  ]);

  const taskList = projectTasks as unknown as Record<string, unknown>[];
  const timeMap: Record<string, number> = {};

  for (const e of allProjectEntries as unknown as { task_id: string; duration_seconds: number | null }[]) {
    // Convert seconds to hours for display consistency
    timeMap[e.task_id] = (timeMap[e.task_id] ?? 0) + ((e.duration_seconds ?? 0) / 3600);
  }

  const STATUS_GROUP: Record<string, string> = {
    to_do:           'todo',
    assigned:        'progress',
    in_progress:     'progress',
    revisions:       'progress',
    internal_review: 'review',
    client_review:   'review',
    completed:       'completed',
    blocked:         'blocked',
  };

  const tasksByStatus: Record<string, TaskSummary[]> = {
    todo: [], progress: [], review: [], completed: [], blocked: [],
  };

  for (const t of taskList) {
    const group = STATUS_GROUP[t.status as string] ?? 'todo';
    tasksByStatus[group].push({
      id:          t.id          as string,
      title:       t.title       as string,
      status:      t.status      as string,
      priority:    t.priority    as string,
      assignee_id: t.assignee_id as string | null,
      deadline:    t.deadline    as string | null,
      project_id:  t.project_id  as string | null,
      time_spent:  timeMap[t.id as string] ?? 0,
    });
  }

  const total = taskList.length;
  return {
    ...base,
    tasks_by_status: tasksByStatus,
    task_totals: {
      total,
      todo:      tasksByStatus.todo.length,
      progress:  tasksByStatus.progress.length,
      review:    tasksByStatus.review.length,
      completed: tasksByStatus.completed.length,
      blocked:   tasksByStatus.blocked.length,
    },
  };
}

export async function createProject(dto: CreateProjectDto): Promise<ProjectWithStats> {
  const { firm_id, name, description, workflow_status = 'todo', member_ids = [], start_date, end_date, priority } = dto;

  const firm = await Firm.findByPk(firm_id, { attributes: ['id'], raw: true });
  if (!firm) {
    throw Object.assign(new Error('Firm not found'), { statusCode: 404 });
  }

  let project;
  try {
    project = await Project.create({
      firm_id,
      name:            name.trim(),
      description:     description?.trim() ?? null,
      status:          'active',
      workflow_status: workflow_status as WorkflowStatus,
      start_date:      start_date ?? null,
      end_date:        end_date   ?? null,
      priority:        priority   ?? 'medium',
    });
  } catch (err) {
    if (err instanceof UniqueConstraintError) {
      throw Object.assign(new Error('A project with this name already exists for this firm'), { statusCode: 409 });
    }
    throw err;
  }

  if (member_ids.length > 0) {
    await syncMembers(project.id, member_ids);
  }

  const members = await fetchMembers(project.id);

  return { ...(project.toJSON() as ProjectRow), firm_name: null, ticket_count: 0, members };
}

export async function updateProject(id: string, updates: UpdateProjectDto): Promise<ProjectWithStats | null> {
  const existing = await Project.findByPk(id, { attributes: ['id'], raw: true });
  if (!existing) return null;

  const { member_ids, ...rest } = updates;
  const patch: Record<string, unknown> = { ...rest };
  if (typeof patch.name        === 'string') patch.name        = (patch.name as string).trim();
  if (typeof patch.description === 'string') patch.description = (patch.description as string).trim() || null;

  if (Object.keys(patch).length > 0) {
    await Project.update(patch, { where: { id } });
  }

  if (member_ids !== undefined) {
    await syncMembers(id, member_ids);
  }

  return findProjectById(id);
}

export async function addProjectMember(projectId: string, userId: string, actorId?: string): Promise<void> {
  await ProjectMember.upsert({ project_id: projectId, user_id: userId });
  if (actorId) {
    const member = await User.findByPk(userId, { attributes: ['name'], raw: true }) as unknown as { name: string } | null;
    postSystemMessage('project', projectId, actorId, `added ${member?.name ?? 'a member'} to this project`).catch(() => {});
  }
}

export async function removeProjectMember(projectId: string, userId: string, actorId?: string): Promise<void> {
  const member = actorId
    ? await User.findByPk(userId, { attributes: ['name'], raw: true }) as unknown as { name: string } | null
    : null;
  await ProjectMember.destroy({ where: { project_id: projectId, user_id: userId } });
  if (actorId && member) {
    postSystemMessage('project', projectId, actorId, `removed ${member.name} from this project`).catch(() => {});
  }
}

export async function listProjectMembers(projectId: string): Promise<ProjectMemberRow[]> {
  return fetchMembers(projectId);
}

export async function toggleProjectArchive(id: string): Promise<ProjectRow | null> {
  const existing = await Project.findByPk(id, { attributes: ['id', 'status'], raw: true });
  if (!existing) return null;

  const currentStatus = (existing as unknown as { status: string }).status;
  const newStatus = currentStatus === 'active' ? 'archived' : 'active';

  await Project.update({ status: newStatus }, { where: { id } });

  const updated = await Project.findByPk(id, { raw: true });
  return updated ? (updated as unknown as ProjectRow) : null;
}

const ACTIVE_TASK_STATUSES = ['to_do'];

export async function getProjectTasks(id: string): Promise<{ id: string; title: string; status: string; priority: string; parent_task_id: string | null }[]> {
  const rows = await Ticket.findAll({
    where: {
      project_id: id,
      status: { [Op.in]: ACTIVE_TASK_STATUSES },
    },
    attributes: ['id', 'title', 'status', 'priority', 'parent_task_id'],
    order: [['created_at', 'ASC']],
    raw: true,
  });
  return rows as unknown as { id: string; title: string; status: string; priority: string; parent_task_id: string | null }[];
}

// ── Share token ───────────────────────────────────────────────────────────────

export async function generateShareToken(projectId: string): Promise<{ share_token: string } | null> {
  const project = await Project.findByPk(projectId, { attributes: ['id', 'share_token'], raw: true });
  if (!project) return null;

  const p = project as unknown as { id: string; share_token: string | null };
  if (p.share_token) return { share_token: p.share_token };

  const token = randomUUID();
  await Project.update({ share_token: token }, { where: { id: projectId } });
  return { share_token: token };
}

export interface PublicProjectView {
  id:              string;
  name:            string;
  description:     string | null;
  workflow_status: WorkflowStatus;
  firm_name:       string | null;
  members:         { id: string; name: string; avatar_url: string | null }[];
  task_totals:     { total: number; todo: number; in_progress: number; in_review: number; completed: number };
}

export async function getPublicProjectView(shareToken: string): Promise<PublicProjectView | null> {
  const project = await Project.findOne({ where: { share_token: shareToken }, raw: true });
  if (!project) return null;

  const p = project as unknown as ProjectRow;

  const [firmRow, members, tasks] = await Promise.all([
    Firm.findByPk(p.firm_id, { attributes: ['name'], raw: true }),
    fetchMembers(p.id),
    Ticket.findAll({ where: { project_id: p.id, archived: false }, attributes: ['status'], raw: true }),
  ]);

  const STATUS_GROUP: Record<string, string> = {
    to_do:           'todo',
    assigned:        'in_progress',
    in_progress:     'in_progress',
    revisions:       'in_progress',
    internal_review: 'in_review',
    client_review:   'in_review',
    completed:       'completed',
    blocked:         'completed',
  };

  const totals = { total: 0, todo: 0, in_progress: 0, in_review: 0, completed: 0 };
  for (const t of tasks as unknown as { status: string }[]) {
    totals.total++;
    const g = STATUS_GROUP[t.status] as keyof typeof totals | undefined;
    if (g && g !== 'total') totals[g]++;
  }

  return {
    id:              p.id,
    name:            p.name,
    description:     p.description,
    workflow_status: p.workflow_status,
    firm_name:       (firmRow as unknown as { name: string } | null)?.name ?? null,
    members:         members.map((m) => ({ id: m.id, name: m.name, avatar_url: m.avatar_url })),
    task_totals:     totals,
  };
}

export async function deleteProject(
  id: string,
  taskIdsToDelete: string[] = [],
): Promise<{ deleted: boolean; hasTickets: boolean; projectDeleted: boolean }> {
  const existing = await Project.findByPk(id, { attributes: ['id'], raw: true });
  if (!existing) return { deleted: false, hasTickets: false, projectDeleted: false };

  // Delete the selected tasks (and their assignees)
  if (taskIdsToDelete.length > 0) {
    const { TaskAssignee } = await import('../../models');
    await TaskAssignee.destroy({ where: { task_id: { [Op.in]: taskIdsToDelete } } });
    await Ticket.destroy({ where: { id: { [Op.in]: taskIdsToDelete }, project_id: id } });
  }

  // Check if any tasks remain
  const remainingCount = await Ticket.count({ where: { project_id: id } });

  if (remainingCount > 0) {
    // Tasks remain — project stays, only selected tasks were deleted
    return { deleted: true, hasTickets: true, projectDeleted: false };
  }

  // No tasks remain — delete the project
  await Project.destroy({ where: { id } });
  return { deleted: true, hasTickets: false, projectDeleted: true };
}
