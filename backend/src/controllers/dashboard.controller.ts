import logger from '../config/logger';
import { Response } from 'express';
import supabase from '../config/supabase';
import { AuthenticatedRequest } from '../types';

// ─── GET /api/dashboard/admin ─────────────────────────────────────────────────

export async function adminDashboard(_req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const [
      firmsResult,
      ticketsResult,
      pendingResult,
      approvedResult,
      teamResult,
      recentTranscriptsResult,
    ] = await Promise.all([
      supabase.from('firms').select('id', { count: 'exact', head: true }),
      supabase.from('tickets').select('id', { count: 'exact', head: true }),
      supabase
        .from('tickets')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'draft'),
      supabase
        .from('tickets')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'approved'),
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'member'),
      supabase
        .from('transcripts')
        .select('id, title, call_date, duration_sec, firm_id, participants')
        .eq('archived', false)
        .order('call_date', { ascending: false })
        .limit(5),
    ]);

    // Team workload: count of approved tickets per assignee
    const { data: workloadData } = await supabase
      .from('tickets')
      .select('assignee_id, assignee:users!tickets_assignee_id_fkey(name, email)')
      .eq('status', 'approved')
      .not('assignee_id', 'is', null);

    const workloadMap: Record<string, { name: string; email: string; count: number }> = {};

    if (workloadData) {
      for (const row of (workloadData as unknown) as Array<{
        assignee_id: string;
        assignee: { name: string; email: string } | null;
      }>) {
        if (!row.assignee_id) continue;
        if (!workloadMap[row.assignee_id]) {
          workloadMap[row.assignee_id] = {
            name: row.assignee?.name ?? 'Unknown',
            email: row.assignee?.email ?? '',
            count: 0,
          };
        }
        workloadMap[row.assignee_id].count++;
      }
    }

    res.json({
      data: {
        total_firms: firmsResult.count ?? 0,
        total_tickets: ticketsResult.count ?? 0,
        pending_tickets: pendingResult.count ?? 0,
        approved_tickets: approvedResult.count ?? 0,
        team_members: teamResult.count ?? 0,
        recent_transcripts: recentTranscriptsResult.data ?? [],
        team_workload: Object.entries(workloadMap).map(([id, v]) => ({ id, ...v })),
      },
    });
  } catch (err) {
    logger.error('[dashboard.controller] adminDashboard error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── GET /api/dashboard/team-workload ─────────────────────────────────────────

export async function teamWorkload(_req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    // ISSUE-029: replaced 3N per-member COUNT queries with a single view scan
    const { data, error } = await supabase
      .from('v_team_workload')
      .select('*');

    if (error) { res.status(500).json({ error: error.message }); return; }

    const results = (data ?? []).map((row: {
      user_id: string;
      name: string;
      email: string;
      total_assigned: number;
      active_tickets: number;
      resolved_tickets: number;
      draft_tickets: number;
      total_hours_logged: number;
    }) => ({
      user: { id: row.user_id, name: row.name, email: row.email },
      assigned: row.total_assigned ?? 0,
      pending: row.active_tickets ?? 0,
      resolved: row.resolved_tickets ?? 0,
      total_hours: row.total_hours_logged ?? 0,
    }));

    res.json({ data: results });
  } catch (err) {
    logger.error('[dashboard.controller] teamWorkload error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── GET /api/dashboard/overdue-tickets ───────────────────────────────────────
//
// Two overdue categories:
//   past_deadline  — ticket has a deadline that has passed AND is in an active
//                    (non-terminal) status: draft, in_progress, revisions,
//                    internal_review, client_review, compliance_review
//   stale_approved — ticket is 'approved' with no deadline and hasn't been
//                    acted on for 7+ days (updated_at used; acceptable for
//                    staleness detection since the goal is "nobody touched it")
//
// No .limit() here — the dashboard frontend slices to 3 itself. A future
// dedicated overdue page can consume the full list.

// Active statuses that qualify for past-deadline overdue checking.
// Terminal statuses (resolved, closed, discarded) and approved (handled
// separately as stale_approved) are intentionally excluded.
const PAST_DEADLINE_STATUSES = [
  'draft',
  'in_progress',
  'revisions',
  'internal_review',
  'client_review',
  'compliance_review',
] as const;

export async function overdueTickets(_req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const selectClause =
      'id, title, priority, status, firm_id, project_id, assignee_id, created_at, updated_at, deadline, ' +
      'firms(name), assignee:users!tickets_assignee_id_fkey(name)';

    // Query 1: tickets with a past deadline in any active status
    const { data: pastDeadlineData, error: err1 } = await supabase
      .from('tickets')
      .select(selectClause)
      .in('status', PAST_DEADLINE_STATUSES as unknown as string[])
      .lt('deadline', today)
      .eq('archived', false)
      .order('deadline', { ascending: true });

    if (err1) {
      logger.error('[dashboard.controller] overdueTickets past_deadline query error:', err1);
      res.status(500).json({ error: err1.message });
      return;
    }

    // Query 2: approved tickets with no deadline that haven't been touched in 7+ days
    const { data: staleApprovedData, error: err2 } = await supabase
      .from('tickets')
      .select(selectClause)
      .eq('status', 'approved')
      .is('deadline', null)
      .lt('updated_at', sevenDaysAgo)
      .eq('archived', false)
      .order('updated_at', { ascending: true });

    if (err2) {
      logger.error('[dashboard.controller] overdueTickets stale_approved query error:', err2);
      res.status(500).json({ error: err2.message });
      return;
    }

    // Tag each result with its overdue_type so the frontend can display
    // contextually appropriate labels ("Past Deadline" vs "Stale — No Activity").
    // Cast through unknown→Record to satisfy the TS spread constraint on Supabase's
    // inferred row type (which is typed as a complex union, not a plain object).
    const tagged = [
      ...(pastDeadlineData ?? []).map((t) => ({
        ...(t as unknown as Record<string, unknown>),
        overdue_type: 'past_deadline' as const,
      })),
      ...(staleApprovedData ?? []).map((t) => ({
        ...(t as unknown as Record<string, unknown>),
        overdue_type: 'stale_approved' as const,
      })),
    ];

    res.json({ data: tagged });
  } catch (err) {
    logger.error('[dashboard.controller] overdueTickets error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── GET /api/dashboard/member ────────────────────────────────────────────────

export async function memberDashboard(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  const userId = req.user.id;

  try {
    const [assignedResult, pendingResult, timeLogsResult] = await Promise.all([
      supabase
        .from('tickets')
        .select('id', { count: 'exact', head: true })
        .eq('assignee_id', userId),
      supabase
        .from('tickets')
        .select('id', { count: 'exact', head: true })
        .eq('assignee_id', userId)
        .eq('status', 'approved'),
      supabase.from('time_logs').select('hours').eq('user_id', userId),
    ]);

    const totalHours = (timeLogsResult.data ?? []).reduce(
      (sum: number, log: { hours: number }) => sum + (log.hours ?? 0),
      0
    );

    const { data: recentTickets } = await supabase
      .from('tickets')
      .select('id, title, status, priority, type, updated_at, firm_id, project_id, firms(name), project:projects(name)')
      .eq('assignee_id', userId)
      .order('updated_at', { ascending: false })
      .limit(5);

    res.json({
      data: {
        total_assigned: assignedResult.count ?? 0,
        pending_tickets: pendingResult.count ?? 0,
        total_hours_logged: Number(totalHours.toFixed(2)),
        recent_tickets: recentTickets ?? [],
      },
    });
  } catch (err) {
    logger.error('[dashboard.controller] memberDashboard error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
