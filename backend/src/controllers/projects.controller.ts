import { Response } from 'express';
import supabase from '../config/supabase';
import { AuthenticatedRequest } from '../types';

// UUID format guard — reused across handlers
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ─── GET /api/projects?firm_id=X ─────────────────────────────────────────────

export async function listProjects(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { firm_id } = req.query as Record<string, string>;

  if (firm_id && !UUID_RE.test(firm_id)) {
    res.status(400).json({ error: 'firm_id must be a valid UUID' });
    return;
  }

  try {
    // Fetch projects — scoped to firm if firm_id provided, otherwise all projects
    let query = supabase
      .from('projects')
      .select('*, firms(name)')
      .order('created_at', { ascending: false });

    if (firm_id) {
      query = query.eq('firm_id', firm_id);
    }

    const { data: projects, error } = await query;

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    // Fetch ticket counts per project in a single query
    const projectIds = (projects ?? []).map((p: Record<string, unknown>) => p.id as string);

    let ticketCountMap: Record<string, number> = {};
    if (projectIds.length > 0) {
      const { data: ticketCounts, error: countErr } = await supabase
        .from('tickets')
        .select('project_id')
        .in('project_id', projectIds);

      if (countErr) {
        res.status(500).json({ error: countErr.message });
        return;
      }

      // Build a frequency map: project_id → count
      for (const row of ticketCounts ?? []) {
        const r = row as { project_id: string };
        ticketCountMap[r.project_id] = (ticketCountMap[r.project_id] ?? 0) + 1;
      }
    }

    // Shape response — flatten firm join, attach ticket_count
    const enriched = (projects ?? []).map((p: Record<string, unknown>) => {
      const firm = p.firms as { name: string } | null;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { firms: _f, ...rest } = p;
      return {
        ...rest,
        firm_name: firm?.name ?? null,
        ticket_count: ticketCountMap[p.id as string] ?? 0,
      };
    });

    res.json({ data: enriched });
  } catch (err) {
    console.error('[projects.controller] listProjects error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── GET /api/projects/:id ────────────────────────────────────────────────────

export async function getProject(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;

  if (!UUID_RE.test(id)) {
    res.status(400).json({ error: 'Invalid project ID' });
    return;
  }

  try {
    const { data: project, error } = await supabase
      .from('projects')
      .select('*, firms(name)')
      .eq('id', id)
      .single();

    if (error || !project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    // Count tickets associated with this project
    const { count, error: countErr } = await supabase
      .from('tickets')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', id);

    if (countErr) {
      res.status(500).json({ error: countErr.message });
      return;
    }

    const p = project as Record<string, unknown>;
    const firm = p.firms as { name: string } | null;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { firms: _f, ...rest } = p;

    res.json({
      data: {
        ...rest,
        firm_name: firm?.name ?? null,
        ticket_count: count ?? 0,
      },
    });
  } catch (err) {
    console.error('[projects.controller] getProject error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── POST /api/projects ───────────────────────────────────────────────────────

export async function createProject(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { firm_id, name, description } = req.body as {
    firm_id?: string;
    name?: string;
    description?: string;
  };

  // Input validation
  if (!firm_id || typeof firm_id !== 'string' || !firm_id.trim()) {
    res.status(400).json({ error: 'firm_id is required' });
    return;
  }
  if (!UUID_RE.test(firm_id.trim())) {
    res.status(400).json({ error: 'firm_id must be a valid UUID' });
    return;
  }
  if (!name || typeof name !== 'string' || !name.trim()) {
    res.status(400).json({ error: 'name is required' });
    return;
  }

  try {
    // Verify the referenced firm exists
    const { data: firm, error: firmErr } = await supabase
      .from('firms')
      .select('id')
      .eq('id', firm_id.trim())
      .single();

    if (firmErr || !firm) {
      res.status(404).json({ error: 'Firm not found' });
      return;
    }

    const { data: project, error } = await supabase
      .from('projects')
      .insert({
        firm_id: firm_id.trim(),
        name: name.trim(),
        description: description?.trim() ?? null,
        status: 'active',
      })
      .select()
      .single();

    if (error) {
      console.error('[projects.controller] createProject insert error:', error);
      res.status(500).json({ error: error.message });
      return;
    }

    res.status(201).json({ data: project });
  } catch (err) {
    console.error('[projects.controller] createProject error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── PATCH /api/projects/:id ──────────────────────────────────────────────────

export async function updateProject(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;

  if (!UUID_RE.test(id)) {
    res.status(400).json({ error: 'Invalid project ID' });
    return;
  }

  // Only these fields are updatable via this endpoint
  const ALLOWED = ['name', 'description', 'status'] as const;
  const updates: Record<string, unknown> = {};

  for (const key of ALLOWED) {
    if (key in req.body) {
      updates[key] = (req.body as Record<string, unknown>)[key];
    }
  }

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: 'No updatable fields provided' });
    return;
  }

  // Validate status value if provided
  if ('status' in updates && !['active', 'archived'].includes(updates.status as string)) {
    res.status(400).json({ error: 'status must be one of: active, archived' });
    return;
  }

  // Prevent setting name to blank
  if ('name' in updates && (!updates.name || !(updates.name as string).trim())) {
    res.status(400).json({ error: 'name cannot be blank' });
    return;
  }

  try {
    // Supabase update returns null data (not an error) when the row doesn't exist,
    // so we check existence first.
    const { data: existing, error: fetchErr } = await supabase
      .from('projects')
      .select('id')
      .eq('id', id)
      .single();

    if (fetchErr || !existing) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    // Trim name if present
    if ('name' in updates && typeof updates.name === 'string') {
      updates.name = updates.name.trim();
    }
    if ('description' in updates && typeof updates.description === 'string') {
      updates.description = updates.description.trim() || null;
    }

    const { data: updated, error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.json({ data: updated });
  } catch (err) {
    console.error('[projects.controller] updateProject error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── PATCH /api/projects/:id/archive ─────────────────────────────────────────

export async function archiveProject(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;

  if (!UUID_RE.test(id)) {
    res.status(400).json({ error: 'Invalid project ID' });
    return;
  }

  try {
    const { data: existing, error: fetchErr } = await supabase
      .from('projects')
      .select('id, status')
      .eq('id', id)
      .single();

    if (fetchErr || !existing) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    // Toggle: active → archived, archived → active
    const currentStatus = (existing as { id: string; status: string }).status;
    const newStatus = currentStatus === 'active' ? 'archived' : 'active';

    const { data: updated, error } = await supabase
      .from('projects')
      .update({ status: newStatus })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.json({ data: updated });
  } catch (err) {
    console.error('[projects.controller] archiveProject error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── DELETE /api/projects/:id ─────────────────────────────────────────────────

export async function deleteProject(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;

  if (!UUID_RE.test(id)) {
    res.status(400).json({ error: 'Invalid project ID' });
    return;
  }

  try {
    // Existence check — Supabase delete is a no-op on missing rows
    const { data: existing, error: fetchErr } = await supabase
      .from('projects')
      .select('id')
      .eq('id', id)
      .single();

    if (fetchErr || !existing) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    // Block deletion if any tickets reference this project
    const { count, error: countErr } = await supabase
      .from('tickets')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', id);

    if (countErr) {
      res.status(500).json({ error: countErr.message });
      return;
    }

    if ((count ?? 0) > 0) {
      res.status(400).json({
        error: 'Cannot delete project with existing tickets. Archive it instead.',
      });
      return;
    }

    const { error } = await supabase.from('projects').delete().eq('id', id);

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.status(204).send();
  } catch (err) {
    console.error('[projects.controller] deleteProject error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
