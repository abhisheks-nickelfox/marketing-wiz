import logger from '../../config/logger';
import { Response } from 'express';
import { AuthenticatedRequest } from '../../types';
import * as dashboardService from './dashboard.service';

// ─── GET /api/dashboard/admin ─────────────────────────────────────────────────

export async function adminDashboard(_req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const data = await dashboardService.getAdminDashboard();
    res.json({ data });
  } catch (err) {
    logger.error('[dashboard.controller] adminDashboard error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── GET /api/dashboard/team-workload ─────────────────────────────────────────

export async function teamWorkload(_req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const data = await dashboardService.getTeamWorkload();
    res.json({ data });
  } catch (err) {
    logger.error('[dashboard.controller] teamWorkload error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── GET /api/dashboard/overdue-tickets ───────────────────────────────────────

export async function overdueTickets(_req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const data = await dashboardService.getOverdueTickets();
    res.json({ data });
  } catch (err) {
    logger.error('[dashboard.controller] overdueTickets error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── GET /api/dashboard/member ────────────────────────────────────────────────

export async function memberDashboard(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const data = await dashboardService.getMemberDashboard(req.user!.id);
    res.json({ data });
  } catch (err) {
    logger.error('[dashboard.controller] memberDashboard error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
