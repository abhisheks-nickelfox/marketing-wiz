import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireAdmin, requirePermission } from '../../middleware/rbac';
import { createFirmValidation, updateFirmValidation } from './firms.validation';
import * as firmsController from './firms.controller';

const router = Router();

// All firm routes require authentication
router.use(authenticate);

// GET  /api/firms — requires manage_firms permission
router.get('/', requirePermission('manage_firms'), firmsController.listFirms);

// POST /api/firms — requires manage_firms permission
router.post('/', requirePermission('manage_firms'), createFirmValidation, firmsController.createFirm);

// GET  /api/firms/:id — requires manage_firms permission
router.get('/:id', requirePermission('manage_firms'), firmsController.getFirm);

// PATCH /api/firms/:id — requires manage_firms permission
router.patch('/:id', requirePermission('manage_firms'), updateFirmValidation, firmsController.updateFirm);

// DELETE /api/firms/:id — admin only
router.delete('/:id', requireAdmin, firmsController.deleteFirm);

export default router;
