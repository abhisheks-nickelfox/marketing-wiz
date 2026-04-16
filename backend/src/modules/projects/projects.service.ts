import logger from '../../config/logger';
import supabase from '../../config/supabase';

// ── Types ────────────────────────────────────────────────────────────────────

export interface Project {
  id: string;
  firm_id: string;
  name: string;
  description: string | null;
  status: 'active' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface ProjectWithStats extends Omit<Project, never> {
  firm_name: string | null;
  ticket_count: number;
}

export interface CreateProjectDto {
  firm_id: string;
  name: string;
  description?: string;
}

export interface UpdateProjectDto {
  name?: string;
  description?: string;
  status?: 'active' | 'archived';
}

// ── Service methods ──────────────────────────────────────────────────────────

export async function findAllProjects(firmId?: string): Promise<ProjectWithStats[]> {
  let query = supabase
    .from('projects')
    .select('*, firms(name)')
    .order('created_at', { ascending: false });

  if (firmId) {
    query = query.eq('firm_id', firmId);
  }

  const { data: projects, error } = await query;

  if (error) {
    logger.error('[projects.service] findAllProjects error:', error);
    throw new Error(error.message);
  }

  // Batch-fetch ticket counts per project in a single query
  const projectIds = (projects ?? []).map((p: Record<string, unknown>) => p.id as string);

  const ticketCountMap: Record<string, number> = {};
  if (projectIds.length > 0) {
    const { data: ticketCounts, error: countErr } = await supabase
      .from('tickets')
      .select('project_id')
      .in('project_id', projectIds);

    if (countErr) {
      logger.error('[projects.service] findAllProjects ticket count error:', countErr);
      throw new Error(countErr.message);
    }

    for (const row of ticketCounts ?? []) {
      const r = row as { project_id: string };
      ticketCountMap[r.project_id] = (ticketCountMap[r.project_id] ?? 0) + 1;
    }
  }

  // Shape response — flatten firm join, attach ticket_count
  return (projects ?? []).map((p: Record<string, unknown>) => {
    const firm = p.firms as { name: string } | null;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { firms: _f, ...rest } = p;
    return {
      ...(rest as unknown as Project),
      firm_name: firm?.name ?? null,
      ticket_count: ticketCountMap[p.id as string] ?? 0,
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

  const { count, error: countErr } = await supabase
    .from('tickets')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', id);

  if (countErr) {
    logger.error('[projects.service] findProjectById ticket count error:', countErr);
    throw new Error(countErr.message);
  }

  const p = project as Record<string, unknown>;
  const firm = p.firms as { name: string } | null;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { firms: _f, ...rest } = p;

  return {
    ...(rest as unknown as Project),
    firm_name: firm?.name ?? null,
    ticket_count: count ?? 0,
  };
}

export async function createProject(dto: CreateProjectDto): Promise<Project> {
  const { firm_id, name, description } = dto;

  // Verify the referenced firm exists
  const { data: firm, error: firmErr } = await supabase
    .from('firms')
    .select('id')
    .eq('id', firm_id)
    .single();

  if (firmErr || !firm) {
    throw Object.assign(new Error('Firm not found'), { statusCode: 404 });
  }

  const { data: project, error } = await supabase
    .from('projects')
    .insert({
      firm_id,
      name: name.trim(),
      description: description?.trim() ?? null,
      status: 'active',
    })
    .select()
    .single();

  if (error) {
    logger.error('[projects.service] createProject error:', error);
    throw new Error(error.message);
  }

  return project as Project;
}

export async function updateProject(id: string, updates: UpdateProjectDto): Promise<Project | null> {
  // Existence check — Supabase update is a no-op on missing rows
  const { data: existing, error: fetchErr } = await supabase
    .from('projects')
    .select('id')
    .eq('id', id)
    .single();

  if (fetchErr || !existing) return null;

  // Trim string fields
  const patch: Record<string, unknown> = { ...updates };
  if (typeof patch.name === 'string') patch.name = (patch.name as string).trim();
  if (typeof patch.description === 'string') patch.description = (patch.description as string).trim() || null;

  const { data: updated, error } = await supabase
    .from('projects')
    .update(patch)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    logger.error('[projects.service] updateProject error:', error);
    throw new Error(error.message);
  }

  return updated as Project;
}

export async function toggleProjectArchive(id: string): Promise<Project | null> {
  const { data: existing, error: fetchErr } = await supabase
    .from('projects')
    .select('id, status')
    .eq('id', id)
    .single();

  if (fetchErr || !existing) return null;

  const newStatus = (existing as { id: string; status: string }).status === 'active' ? 'archived' : 'active';

  const { data: updated, error } = await supabase
    .from('projects')
    .update({ status: newStatus })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    logger.error('[projects.service] toggleProjectArchive error:', error);
    throw new Error(error.message);
  }

  return updated as Project;
}

export async function deleteProject(id: string): Promise<{ deleted: boolean; hasTickets: boolean }> {
  // Existence check
  const { data: existing, error: fetchErr } = await supabase
    .from('projects')
    .select('id')
    .eq('id', id)
    .single();

  if (fetchErr || !existing) return { deleted: false, hasTickets: false };

  // Block deletion if tickets reference this project
  const { count, error: countErr } = await supabase
    .from('tickets')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', id);

  if (countErr) {
    logger.error('[projects.service] deleteProject ticket count error:', countErr);
    throw new Error(countErr.message);
  }

  if ((count ?? 0) > 0) return { deleted: false, hasTickets: true };

  const { error } = await supabase.from('projects').delete().eq('id', id);

  if (error) {
    logger.error('[projects.service] deleteProject error:', error);
    throw new Error(error.message);
  }

  return { deleted: true, hasTickets: false };
}
