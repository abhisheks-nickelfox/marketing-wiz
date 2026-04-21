import logger from '../../config/logger';
import supabase from '../../config/supabase';
import type { CreateProjectDto } from './dto/create-project.dto';
import type { UpdateProjectDto } from './dto/update-project.dto';

// ── Types ─────────────────────────────────────────────────────────────────────

export type WorkflowStatus = 'todo' | 'in_progress' | 'in_review' | 'approved' | 'completed';

export interface Project {
  id:              string;
  firm_id:         string;
  name:            string;
  description:     string | null;
  status:          'active' | 'archived';
  workflow_status: WorkflowStatus;
  created_at:      string;
  updated_at:      string;
}

export interface ProjectMember {
  user_id:    string;
  name:       string;
  email:      string;
  avatar_url: string | null;
  added_at:   string;
}

export interface ProjectWithStats extends Project {
  firm_name:    string | null;
  ticket_count: number;
  members:      ProjectMember[];
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

async function fetchMembers(projectId: string): Promise<ProjectMember[]> {
  const { data, error } = await supabase
    .from('project_members')
    .select('user_id, added_at, users(name, email, avatar_url)')
    .eq('project_id', projectId)
    .order('added_at', { ascending: true });

  if (error) {
    logger.error('[projects.service] fetchMembers error:', error);
    return [];
  }

  return (data ?? []).map((row: Record<string, unknown>) => {
    const user = row.users as { name: string; email: string; avatar_url: string | null } | null;
    return {
      user_id:    row.user_id as string,
      name:       user?.name  ?? '',
      email:      user?.email ?? '',
      avatar_url: user?.avatar_url ?? null,
      added_at:   row.added_at as string,
    };
  });
}

async function syncMembers(projectId: string, memberIds: string[]): Promise<void> {
  // Delete existing members not in new list
  await supabase
    .from('project_members')
    .delete()
    .eq('project_id', projectId)
    .not('user_id', 'in', `(${memberIds.map((id) => `'${id}'`).join(',')})`);

  if (memberIds.length === 0) return;

  // Upsert new members (ignore duplicates)
  const rows = memberIds.map((user_id) => ({ project_id: projectId, user_id }));
  const { error } = await supabase
    .from('project_members')
    .upsert(rows, { onConflict: 'project_id,user_id', ignoreDuplicates: true });

  if (error) {
    logger.error('[projects.service] syncMembers error:', error);
    throw new Error(error.message);
  }
}

function shapeProject(p: Record<string, unknown>): Project {
  const { firms: _f, ...rest } = p;
  return rest as unknown as Project;
}

// ── Service methods ───────────────────────────────────────────────────────────

export async function findAllProjects(firmId?: string): Promise<ProjectWithStats[]> {
  let query = supabase
    .from('projects')
    .select('*, firms(name)')
    .order('created_at', { ascending: false });

  if (firmId) query = query.eq('firm_id', firmId);

  const { data: projects, error } = await query;
  if (error) throw new Error(error.message);

  const projectIds = (projects ?? []).map((p: Record<string, unknown>) => p.id as string);

  // Batch: ticket counts
  const ticketCountMap: Record<string, number> = {};
  if (projectIds.length > 0) {
    const { data: ticketCounts, error: cErr } = await supabase
      .from('tickets')
      .select('project_id')
      .in('project_id', projectIds);

    if (cErr) throw new Error(cErr.message);
    for (const row of ticketCounts ?? []) {
      const r = row as { project_id: string };
      ticketCountMap[r.project_id] = (ticketCountMap[r.project_id] ?? 0) + 1;
    }
  }

  // Batch: members per project
  const memberMap: Record<string, ProjectMember[]> = {};
  if (projectIds.length > 0) {
    const { data: memberRows, error: mErr } = await supabase
      .from('project_members')
      .select('project_id, user_id, added_at, users(name, email, avatar_url)')
      .in('project_id', projectIds);

    if (mErr) throw new Error(mErr.message);
    for (const row of memberRows ?? []) {
      const r = row as Record<string, unknown>;
      const user = r.users as { name: string; email: string; avatar_url: string | null } | null;
      const pid = r.project_id as string;
      if (!memberMap[pid]) memberMap[pid] = [];
      memberMap[pid].push({
        user_id:    r.user_id as string,
        name:       user?.name  ?? '',
        email:      user?.email ?? '',
        avatar_url: user?.avatar_url ?? null,
        added_at:   r.added_at as string,
      });
    }
  }

  return (projects ?? []).map((p: Record<string, unknown>) => {
    const firm = p.firms as { name: string } | null;
    return {
      ...shapeProject(p),
      firm_name:    firm?.name ?? null,
      ticket_count: ticketCountMap[p.id as string] ?? 0,
      members:      memberMap[p.id as string]      ?? [],
    };
  });
}

export async function findProjectById(id: string): Promise<ProjectWithStats | null> {
  const { data: project, error } = await supabase
    .from('projects')
    .select('*, firms(name)')
    .eq('id', id)
    .single();

  if (error || !project) return null;

  const { count } = await supabase
    .from('tickets')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', id);

  const members = await fetchMembers(id);
  const p = project as Record<string, unknown>;
  const firm = p.firms as { name: string } | null;

  return {
    ...shapeProject(p),
    firm_name:    firm?.name ?? null,
    ticket_count: count ?? 0,
    members,
  };
}

export async function getProjectOverview(id: string): Promise<ProjectOverview | null> {
  const base = await findProjectById(id);
  if (!base) return null;

  // Fetch all tasks for this project
  const { data: tickets, error: tErr } = await supabase
    .from('tickets')
    .select('id, title, status, priority, assignee_id, deadline, project_id')
    .eq('project_id', id)
    .eq('archived', false)
    .order('updated_at', { ascending: false });

  if (tErr) throw new Error(tErr.message);

  // Batch time_spent per ticket
  const ticketIds = (tickets ?? []).map((t: Record<string, unknown>) => t.id as string);
  const timeMap: Record<string, number> = {};

  if (ticketIds.length > 0) {
    const { data: logs } = await supabase
      .from('time_logs')
      .select('ticket_id, hours, log_type')
      .in('ticket_id', ticketIds)
      .not('log_type', 'in', '("final","revision","transition")');

    for (const log of logs ?? []) {
      const l = log as { ticket_id: string; hours: number };
      timeMap[l.ticket_id] = (timeMap[l.ticket_id] ?? 0) + l.hours;
    }
  }

  const STATUS_GROUP: Record<string, string> = {
    draft:              'todo',
    in_progress:        'in_progress',
    revisions:          'in_progress',
    internal_review:    'in_review',
    client_review:      'in_review',
    compliance_review:  'in_review',
    approved:           'approved',
    closed:             'completed',
    discarded:          'discarded',
  };

  const tasksByStatus: Record<string, TaskSummary[]> = {
    todo: [], in_progress: [], in_review: [], approved: [], completed: [], discarded: [],
  };

  for (const t of tickets ?? []) {
    const ticket = t as Record<string, unknown>;
    const group  = STATUS_GROUP[ticket.status as string] ?? 'todo';
    const summary: TaskSummary = {
      id:          ticket.id          as string,
      title:       ticket.title       as string,
      status:      ticket.status      as string,
      priority:    ticket.priority    as string,
      assignee_id: ticket.assignee_id as string | null,
      deadline:    ticket.deadline    as string | null,
      project_id:  ticket.project_id  as string | null,
      time_spent:  timeMap[ticket.id as string] ?? 0,
    };
    tasksByStatus[group].push(summary);
  }

  const total = (tickets ?? []).length;
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

  const { data: firm, error: firmErr } = await supabase
    .from('firms').select('id').eq('id', firm_id).single();

  if (firmErr || !firm) {
    throw Object.assign(new Error('Firm not found'), { statusCode: 404 });
  }

  const { data: project, error } = await supabase
    .from('projects')
    .insert({ firm_id, name: name.trim(), description: description?.trim() ?? null, status: 'active', workflow_status })
    .select()
    .single();

  if (error) throw new Error(error.message);

  const created = project as Project;

  // Add initial members
  if (member_ids.length > 0) {
    await syncMembers(created.id, member_ids);
  }

  const members = await fetchMembers(created.id);

  return { ...created, firm_name: null, ticket_count: 0, members };
}

export async function updateProject(id: string, updates: UpdateProjectDto): Promise<ProjectWithStats | null> {
  const { data: existing, error: fetchErr } = await supabase
    .from('projects').select('id').eq('id', id).single();

  if (fetchErr || !existing) return null;

  const { member_ids, ...rest } = updates;
  const patch: Record<string, unknown> = { ...rest };
  if (typeof patch.name        === 'string') patch.name        = (patch.name as string).trim();
  if (typeof patch.description === 'string') patch.description = (patch.description as string).trim() || null;

  if (Object.keys(patch).length > 0) {
    const { error } = await supabase.from('projects').update(patch).eq('id', id);
    if (error) throw new Error(error.message);
  }

  // Sync members if provided
  if (member_ids !== undefined) {
    await syncMembers(id, member_ids);
  }

  return findProjectById(id);
}

export async function addProjectMember(projectId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('project_members')
    .upsert({ project_id: projectId, user_id: userId }, { onConflict: 'project_id,user_id', ignoreDuplicates: true });

  if (error) throw new Error(error.message);
}

export async function removeProjectMember(projectId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('project_members')
    .delete()
    .eq('project_id', projectId)
    .eq('user_id', userId);

  if (error) throw new Error(error.message);
}

export async function listProjectMembers(projectId: string): Promise<ProjectMember[]> {
  return fetchMembers(projectId);
}

export async function toggleProjectArchive(id: string): Promise<Project | null> {
  const { data: existing, error: fetchErr } = await supabase
    .from('projects').select('id, status').eq('id', id).single();

  if (fetchErr || !existing) return null;

  const newStatus = (existing as { status: string }).status === 'active' ? 'archived' : 'active';

  const { data: updated, error } = await supabase
    .from('projects').update({ status: newStatus }).eq('id', id).select().single();

  if (error) throw new Error(error.message);
  return updated as Project;
}

export async function deleteProject(id: string): Promise<{ deleted: boolean; hasTickets: boolean }> {
  const { data: existing, error: fetchErr } = await supabase
    .from('projects').select('id').eq('id', id).single();

  if (fetchErr || !existing) return { deleted: false, hasTickets: false };

  const { count } = await supabase
    .from('tickets').select('id', { count: 'exact', head: true }).eq('project_id', id);

  if ((count ?? 0) > 0) return { deleted: false, hasTickets: true };

  const { error } = await supabase.from('projects').delete().eq('id', id);
  if (error) throw new Error(error.message);

  return { deleted: true, hasTickets: false };
}
