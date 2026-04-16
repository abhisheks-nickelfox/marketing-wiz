import logger from '../../config/logger';
import supabase from '../../config/supabase';
import { STATUS_PRIORITY } from '../../config/constants';

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

  const selectClause = `id, session_id, firm_id, assignee_id, project_id, title, description, type, priority, status,
     change_note, estimated_hours, ai_generated, edited, archived, created_at, updated_at,
     deadline, regeneration_count, last_regenerated_at, revision_count,
     firms(name),
     assignee:users!tickets_assignee_id_fkey(name, email),
     time_logs(hours, log_type)`;

  let query = supabase
    .from('tickets')
    .select(selectClause)
    .order('updated_at', { ascending: false });

  const canViewAll =
    userRole === 'admin' ||
    userRole === 'super_admin' ||
    userPermissions.includes('view_all_tickets');

  if (!canViewAll) {
    query = query.eq('assignee_id', userId).eq('archived', false);
  } else {
    const { firm_id, assignee_id, status, type, priority, archived, project_id, overdue, session_id } = filters;

    if (firm_id) query = query.eq('firm_id', firm_id);
    if (assignee_id) query = query.eq('assignee_id', assignee_id);
    if (type) query = query.eq('type', type);
    if (priority) query = query.eq('priority', priority);
    if (project_id) query = query.eq('project_id', project_id);
    if (session_id) query = query.eq('session_id', session_id);

    if (overdue === 'true') {
      const today = new Date().toISOString().split('T')[0];
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const activeStatuses = 'draft,in_progress,revisions,internal_review,client_review,compliance_review';

      query = query.or(
        `and(deadline.lt.${today},status.in.(${activeStatuses})),` +
        `and(status.eq.approved,deadline.is.null,updated_at.lt.${sevenDaysAgo})`
      );
      query = query.eq('archived', false);
    } else {
      if (status) query = query.eq('status', status);
      if (archived === 'true') {
        query = query.eq('archived', true);
      } else {
        query = query.eq('archived', false);
      }
    }
  }

  const { data, error } = await query;

  if (error) {
    logger.error('[tasks.service] findAllTasks error:', error);
    throw new Error(error.message);
  }

  // Batch-fetch project names to avoid relying on PostgREST FK join detection
  const projectIds = [...new Set(
    (data ?? []).map((t: Record<string, unknown>) => t.project_id).filter(Boolean)
  )] as string[];

  const projectMap: Record<string, string> = {};
  if (projectIds.length > 0) {
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id, name')
      .in('id', projectIds);
    if (projectsError) {
      logger.error('[tasks.service] findAllTasks: failed to fetch project names:', projectsError.message);
    }
    (projects ?? []).forEach((p: { id: string; name: string }) => {
      projectMap[p.id] = p.name;
    });
  }

  // Compute time_spent and attach project name
  const enriched = (data ?? []).map((t: Record<string, unknown>) => {
    const timeLogs = t.time_logs as Array<{ hours: number; log_type: string }> | null;
    const time_spent = (timeLogs ?? [])
      .filter((l) => l.log_type !== 'final' && l.log_type !== 'revision')
      .reduce((sum: number, l) => sum + (l.hours ?? 0), 0);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { time_logs: _tl, ...rest } = t;
    const projectName = t.project_id ? projectMap[t.project_id as string] : undefined;
    return {
      ...rest,
      project: projectName ? { name: projectName } : null,
      time_spent: Number(time_spent.toFixed(2)),
    };
  });

  // Sort by status priority, then most-recently-updated within same status
  enriched.sort((a, b) => {
    const pa = STATUS_PRIORITY[(a as Record<string, unknown>).status as string] ?? 99;
    const pb = STATUS_PRIORITY[(b as Record<string, unknown>).status as string] ?? 99;
    if (pa !== pb) return pa - pb;
    return new Date((b as Record<string, unknown>).updated_at as string).getTime()
         - new Date((a as Record<string, unknown>).updated_at as string).getTime();
  });

  return enriched;
}

export async function findTaskById(id: string): Promise<unknown | null> {
  const { data: ticket, error } = await supabase
    .from('tickets')
    .select(
      `*, firms(name, contact_name, contact_email),
       assignee:users!tickets_assignee_id_fkey(id, name, email)`
    )
    .eq('id', id)
    .single();

  if (error || !ticket) return null;
  return ticket;
}

export async function createTask(dto: CreateTaskDto): Promise<unknown> {
  const { firm_id, title, type, priority = 'normal', description } = dto;

  // Verify firm exists
  const { data: firm, error: firmErr } = await supabase
    .from('firms')
    .select('id')
    .eq('id', firm_id)
    .single();

  if (firmErr || !firm) {
    throw Object.assign(new Error('Firm not found'), { statusCode: 404 });
  }

  const { data: ticket, error } = await supabase
    .from('tickets')
    .insert({
      firm_id,
      title: title.trim(),
      type,
      priority,
      description: description?.trim() ?? null,
      session_id: null,
      ai_generated: false,
      status: 'draft',
      assignee_id: null,
      edited: false,
      change_note: '',
    })
    .select()
    .single();

  if (error) {
    logger.error('[tasks.service] createTask error:', error);
    throw new Error(error.message);
  }

  return ticket;
}

export async function updateTask(
  id: string,
  updates: Record<string, unknown>
): Promise<unknown | null> {
  const { data, error } = await supabase
    .from('tickets')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    logger.error('[tasks.service] updateTask error:', error);
    throw new Error(error.message);
  }

  return data;
}

export async function findRawTask(id: string): Promise<Record<string, unknown> | null> {
  const { data, error } = await supabase
    .from('tickets')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return null;
  return data as Record<string, unknown>;
}

export async function assignAndApproveTask(
  id: string,
  dto: AssignApproveDto
): Promise<unknown | null> {
  const { assignee_id, priority, deadline, project_id } = dto;

  // Verify assignee exists
  const { data: assignee, error: userErr } = await supabase
    .from('users')
    .select('id')
    .eq('id', assignee_id)
    .single();

  if (userErr || !assignee) {
    throw Object.assign(new Error('Assignee user not found'), { statusCode: 400 });
  }

  const updatePayload: Record<string, unknown> = {
    assignee_id,
    status: 'in_progress',
    updated_at: new Date().toISOString(),
  };
  if (priority) updatePayload.priority = priority;
  if (deadline) updatePayload.deadline = deadline;
  if (project_id) updatePayload.project_id = project_id;

  const { data, error } = await supabase
    .from('tickets')
    .update(updatePayload)
    .eq('id', id)
    .eq('status', 'draft') // can only approve draft tickets
    .select()
    .single();

  if (error) {
    logger.error('[tasks.service] assignAndApproveTask error:', error);
    throw new Error(error.message);
  }

  if (!data) return null;

  // Create a notification for the assignee
  await supabase.from('notifications').insert({
    user_id: assignee_id,
    title: 'New task assigned',
    message: (data as Record<string, unknown>).title,
    ticket_id: (data as Record<string, unknown>).id,
  });

  return data;
}

export async function discardTask(id: string): Promise<unknown | null> {
  const { data, error } = await supabase
    .from('tickets')
    .update({ status: 'discarded', updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'draft')
    .select()
    .single();

  if (error) {
    logger.error('[tasks.service] discardTask error:', error);
    throw new Error(error.message);
  }

  return data ?? null;
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase.from('tickets').delete().eq('id', id);

  if (error) {
    logger.error('[tasks.service] deleteTask error:', error);
    throw new Error(error.message);
  }
}

export async function archiveTask(id: string, archived: boolean): Promise<unknown | null> {
  const { data, error } = await supabase
    .from('tickets')
    .update({ archived })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    logger.error('[tasks.service] archiveTask error:', error);
    throw new Error(error.message);
  }

  return data;
}

// State machine: maps each status to the set of statuses it may transition to.
// Enforced server-side — the client cannot bypass this by sending an arbitrary status.
export const VALID_TRANSITIONS: Record<string, string[]> = {
  draft:              ['in_progress', 'discarded'],
  in_progress:        ['resolved', 'discarded'],
  resolved:           ['internal_review'],
  internal_review:    ['client_review', 'revisions'],
  client_review:      ['compliance_review', 'revisions'],
  compliance_review:  ['approved', 'revisions'],
  approved:           ['closed'],
  revisions:          ['internal_review'],
  closed:             [],
  discarded:          [],
};

export async function transitionTask(options: {
  ticketId: string;
  targetStatus: string;
  changeNote?: string;
  userId: string;
}): Promise<unknown | null> {
  const { ticketId, targetStatus, changeNote, userId } = options;

  const { data: ticket, error: fetchErr } = await supabase
    .from('tickets')
    .select('id, status, revision_count')
    .eq('id', ticketId)
    .single();

  if (fetchErr || !ticket) return null;

  const allowed = VALID_TRANSITIONS[(ticket as { status: string }).status] ?? [];
  if (!allowed.includes(targetStatus)) {
    throw Object.assign(
      new Error(`Cannot transition task from '${(ticket as { status: string }).status}' to '${targetStatus}'`),
      { statusCode: 400 }
    );
  }

  const updates: Record<string, unknown> = {
    status: targetStatus,
    updated_at: new Date().toISOString(),
  };
  if (changeNote !== undefined) updates.change_note = changeNote;

  // Moving back to draft removes the assignee so the ticket is unassigned again
  if (targetStatus === 'draft') updates.assignee_id = null;

  // When sending to revisions, increment the cycle counter
  if (targetStatus === 'revisions') {
    updates.revision_count = ((ticket as { revision_count: number }).revision_count ?? 0) + 1;
  }

  const { data, error } = await supabase
    .from('tickets')
    .update(updates)
    .eq('id', ticketId)
    .select()
    .single();

  if (error) {
    logger.error('[tasks.service] transitionTask error:', error);
    throw new Error(error.message);
  }

  // Insert revision milestone log or transition audit log
  if (targetStatus === 'revisions') {
    const newCycle = ((ticket as { revision_count: number }).revision_count ?? 0) + 1;
    const { error: markerErr } = await supabase.from('time_logs').insert({
      ticket_id: ticketId,
      user_id: userId,
      hours: 0,
      comment: changeNote ?? '',
      log_type: 'revision',
      revision_cycle: newCycle,
    });
    if (markerErr) {
      logger.error('[tasks.service] Failed to insert revision marker log:', markerErr);
    }
  } else {
    const { error: transitionErr } = await supabase.from('time_logs').insert({
      ticket_id: ticketId,
      user_id: userId,
      hours: 0,
      comment: targetStatus,
      log_type: 'transition',
      revision_cycle: (ticket as { revision_count: number }).revision_count ?? 0,
    });
    if (transitionErr) {
      logger.error('[tasks.service] Failed to insert transition log:', transitionErr);
    }
  }

  return data;
}

export async function resolveTask(options: {
  ticketId: string;
  userId: string;
  finalComment?: string;
  estimatedHours?: number;
}): Promise<unknown | null> {
  const { ticketId, userId, finalComment, estimatedHours } = options;

  const { data: ticket, error: fetchErr } = await supabase
    .from('tickets')
    .select('id, assignee_id, status, revision_count')
    .eq('id', ticketId)
    .single();

  if (fetchErr || !ticket) return null;

  const updates: Record<string, unknown> = {
    status: 'resolved',
    updated_at: new Date().toISOString(),
  };
  if (estimatedHours !== undefined) updates.estimated_hours = estimatedHours;

  const { data: updated, error: updateErr } = await supabase
    .from('tickets')
    .update(updates)
    .eq('id', ticketId)
    .select()
    .single();

  if (updateErr) {
    logger.error('[tasks.service] resolveTask error:', updateErr);
    throw new Error(updateErr.message);
  }

  // Create a final time log if a comment is provided
  if (finalComment) {
    const { data: existingLogs } = await supabase
      .from('time_logs')
      .select('hours')
      .eq('ticket_id', ticketId)
      .neq('log_type', 'final');

    const totalHours = (existingLogs ?? []).reduce(
      (sum: number, log: { hours: number }) => sum + parseFloat(String(log.hours ?? 0)),
      0
    );

    await supabase.from('time_logs').insert({
      ticket_id: ticketId,
      user_id: userId,
      hours: Number(totalHours.toFixed(2)),
      comment: finalComment,
      log_type: 'final',
      revision_cycle: (ticket as { revision_count: number }).revision_count ?? 0,
    });
  }

  return updated;
}
