import { Router } from 'express';
import authRoutes from './auth';
import dashboardRoutes from './dashboard';
import transcriptRoutes from './transcripts';
import firmRoutes from './firms';
import ticketRoutes from './tickets';
import teamRoutes from './team';
import promptRoutes from './prompts';
import notificationRoutes from './notifications';
import projectsRouter from './projects.route';
import usersRouter from '../modules/users/users.routes';
import skillsRouter from '../modules/skills/skills.routes';
import memberRolesRouter from '../modules/member-roles/member-roles.routes';

const router = Router();

// Health check
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

router.use('/auth', authRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/transcripts', transcriptRoutes);
router.use('/firms', firmRoutes);
router.use('/tickets', ticketRoutes);
router.use('/team', teamRoutes);
router.use('/prompts', promptRoutes);
router.use('/notifications', notificationRoutes);
router.use('/projects', projectsRouter);

// ── Module-based routes (frontend-new) ───────────────────────────────────────
router.use('/users', usersRouter);
router.use('/skills', skillsRouter);
router.use('/member-roles', memberRolesRouter);

export default router;
