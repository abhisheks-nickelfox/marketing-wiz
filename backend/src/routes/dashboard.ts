import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireAdmin, requireMember } from '../middleware/rbac';
import {
  adminDashboard,
  memberDashboard,
  teamWorkload,
  overdueTickets,
} from '../controllers/dashboard.controller';

const router = Router();

router.use(authenticate);

// Admin dashboard routes
router.get('/admin', requireAdmin, adminDashboard);
router.get('/stats', requireAdmin, adminDashboard);          // alias used by frontend
router.get('/team-workload', requireAdmin, teamWorkload);
router.get('/overdue-tickets', requireAdmin, overdueTickets);

// Member dashboard routes
router.get('/member', requireMember, memberDashboard);
router.get('/member-stats', requireMember, memberDashboard); // alias used by frontend

export default router;
