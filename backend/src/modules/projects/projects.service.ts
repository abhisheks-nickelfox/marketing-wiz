import logger from '../../config/logger';
import { Op } from 'sequelize';
import sequelize from '../../config/database';
import { Project, Firm, Ticket, TimeLog, ProjectMember, User } from '../../models';
import type { CreateProjectDto } from './dto/create-project.dto';
import type { UpdateProjectDto } from './dto/update-project.dto';

// ── Types ─────────────────────────────────────────────────────────────────────

export type WorkflowStatus = 'todo' | 'in_progress' | 'in_review' | 'approved' | 'completed';

export interface ProjectRow {
  id:              string;
  firm_id:         string;
  name:            string;
  description:     string | null;
  status:          'active' | 'archived';
  workflow_status: WorkflowStatus;
  created_at:      string;
  updated_at:      string;
}

export interface ProjectMemberRow {
  user_id:    string;
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
    total:       number;
    todo:        number;
    in_progress: number;
    in_review:   number;
    approved:    number;
    completed:   number;
    discarded:   number;
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
      user_id:    r.user_id,
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
      user_id:    r.user_id,
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

  const projectTasks = await Ticket.findAll({
    where: { project_id: id, archived: false },
    attributes: ['id', 'title', 'status', 'priority', 'assignee_id', 'deadline', 'project_id'],
    order: [['updated_at', 'DESC']],
    raw: true,
  });

  const taskList = projectTasks as unknown as Record<string, unknown>[];
  const taskIds  = taskList.map((t) => t.id as string);
  const timeMap: Record<string, number> = {};

  if (taskIds.length > 0) {
    const logs = await TimeLog.findAll({
      where: {
        ticket_id: { [Op.in]: taskIds },
        log_type:  { [Op.notIn]: ['final', 'revision', 'transition'] },
      },
      attributes: ['ticket_id', 'hours'],
      raw: true,
    });
    for (const l of logs as unknown as { ticket_id: string; hours: number }[]) {
      timeMap[l.ticket_id] = (timeMap[l.ticket_id] ?? 0) + Number(l.hours ?? 0);
    }
  }

  const STATUS_GROUP: Record<string, string> = {
    draft:             'todo',
    in_progress:       'in_progress',
    revisions:         'in_progress',
    internal_review:   'in_review',
    client_review:     'in_review',
    compliance_review: 'in_review',
    approved:          'approved',
    closed:            'completed',
    discarded:         'discarded',
  };

  const tasksByStatus: Record<string, TaskSummary[]> = {
    todo: [], in_progress: [], in_review: [], approved: [], completed: [], discarded: [],
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
      todo:        tasksByStatus.todo.length,
      in_progress: tasksByStatus.in_progress.length,
      in_review:   tasksByStatus.in_review.length,
      approved:    tasksByStatus.approved.length,
      completed:   tasksByStatus.completed.length,
      discarded:   tasksByStatus.discarded.length,
    },
  };
}

export async function createProject(dto: CreateProjectDto): Promise<ProjectWithStats> {
  const { firm_id, name, description, workflow_status = 'todo', member_ids = [] } = dto;

  const firm = await Firm.findByPk(firm_id, { attributes: ['id'], raw: true });
  if (!firm) {
    throw Object.assign(new Error('Firm not found'), { statusCode: 404 });
  }

  const project = await Project.create({
    firm_id,
    name:            name.trim(),
    description:     description?.trim() ?? null,
    status:          'active',
    workflow_status: workflow_status as WorkflowStatus,
  });

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

export async function addProjectMember(projectId: string, userId: string): Promise<void> {
  await ProjectMember.upsert({ project_id: projectId, user_id: userId });
}

export async function removeProjectMember(projectId: string, userId: string): Promise<void> {
  await ProjectMember.destroy({ where: { project_id: projectId, user_id: userId } });
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

export async function deleteProject(id: string): Promise<{ deleted: boolean; hasTickets: boolean }> {
  const existing = await Project.findByPk(id, { attributes: ['id'], raw: true });
  if (!existing) return { deleted: false, hasTickets: false };

  const ticketCount = await Ticket.count({ where: { project_id: id } });
  if (ticketCount > 0) return { deleted: false, hasTickets: true };

  await Project.destroy({ where: { id } });
  return { deleted: true, hasTickets: false };
}
