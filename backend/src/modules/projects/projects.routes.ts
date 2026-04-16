import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requirePermission, requireSuperAdmin } from '../../middleware/rbac';
import { listProjectsValidation, createProjectValidation, updateProjectValidation } from './projects.validation';
import * as projectsController from './projects.controller';

const router = Router();

// manage_projects: admins always pass; members pass only if they have the permission
router.get('/', authenticate, requirePermission('manage_projects'), listProjectsValidation, projectsController.listProjects);
router.post('/', authenticate, requirePermission('manage_projects'), createProjectValidation, projectsController.createProject);
router.get('/:id', authenticate, requirePermission('manage_projects'), projectsController.getProject);
router.patch('/:id', authenticate, requirePermission('manage_projects'), updateProjectValidation, projectsController.updateProject);
router.patch('/:id/archive', authenticate, requirePermission('manage_projects'), projectsController.archiveProject);
router.delete('/:id', authenticate, requireSuperAdmin, projectsController.deleteProject);

export default router;
