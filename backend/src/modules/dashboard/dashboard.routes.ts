import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireAdmin, requireMember } from '../../middleware/rbac';
import * as dashboardController from './dashboard.controller';

const router = Router();

// All dashboard routes require authentication
router.use(authenticate);

// GET /api/dashboard/admin — admin only
router.get('/admin', requireAdmin, dashboardController.adminDashboard);

// GET /api/dashboard/stats — alias used by frontend
router.get('/stats', requireAdmin, dashboardController.adminDashboard);

// GET /api/dashboard/team-workload — admin only
router.get('/team-workload', requireAdmin, dashboardController.teamWorkload);

// GET /api/dashboard/overdue-tickets — admin only
router.get('/overdue-tickets', requireAdmin, dashboardController.overdueTickets);

// GET /api/dashboard/member — member-level
router.get('/member', requireMember, dashboardController.memberDashboard);

// GET /api/dashboard/member-stats — alias used by frontend
router.get('/member-stats', requireMember, dashboardController.memberDashboard);

export default router;
