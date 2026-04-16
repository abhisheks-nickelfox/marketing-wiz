import { Router } from 'express';

// ── Module-based routes ───────────────────────────────────────────────────────
import authRouter from '../modules/auth/auth.routes';
import usersRouter from '../modules/users/users.routes';
import skillsRouter from '../modules/skills/skills.routes';
import memberRolesRouter from '../modules/member-roles/member-roles.routes';
import notificationsRouter from '../modules/notifications/notifications.routes';
import promptsRouter from '../modules/prompts/prompts.routes';
import firmsRouter from '../modules/firms/firms.routes';
import dashboardRouter from '../modules/dashboard/dashboard.routes';
import projectsRouter from '../modules/projects/projects.routes';
import teamRouter from '../modules/team/team.routes';
import transcriptsRouter from '../modules/transcripts/transcripts.routes';
import tasksRouter from '../modules/tasks/tasks.routes';

const router = Router();

// Health check
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Route mounts ──────────────────────────────────────────────────────────────
router.use('/auth', authRouter);
router.use('/users', usersRouter);
router.use('/skills', skillsRouter);
router.use('/member-roles', memberRolesRouter);
router.use('/notifications', notificationsRouter);
router.use('/prompts', promptsRouter);
router.use('/firms', firmsRouter);
router.use('/dashboard', dashboardRouter);
router.use('/projects', projectsRouter);
router.use('/team', teamRouter);
router.use('/transcripts', transcriptsRouter);
router.use('/tasks', tasksRouter);

export default router;
