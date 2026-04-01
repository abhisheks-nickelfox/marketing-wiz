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
    console.error('[dashboard.controller] adminDashboard error:', err);
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
    console.error('[dashboard.controller] teamWorkload error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── GET /api/dashboard/overdue-tickets ───────────────────────────────────────

export async function overdueTickets(_req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Overdue = has a deadline that has passed, OR no deadline but approved for 7+ days
    const { data } = await supabase
      .from('tickets')
      .select('id, title, priority, firm_id, assignee_id, created_at, deadline, firms(name), assignee:users!tickets_assignee_id_fkey(name)')
      .eq('status', 'approved')
      .or(`deadline.lt.${today},and(deadline.is.null,updated_at.lt.${sevenDaysAgo})`)
      .order('created_at', { ascending: true })
      .limit(10);

    res.json({ data: data ?? [] });
  } catch (err) {
    console.error('[dashboard.controller] overdueTickets error:', err);
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
      .select('id, title, status, priority, type, updated_at, firms(name)')
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
    console.error('[dashboard.controller] memberDashboard error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
