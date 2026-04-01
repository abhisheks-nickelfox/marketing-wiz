import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireAdmin, requirePermission } from '../middleware/rbac';
import {
  listFirms,
  createFirm,
  getFirm,
  updateFirm,
  deleteFirm,
  createFirmValidation,
  updateFirmValidation,
} from '../controllers/firms.controller';

const router = Router();

router.use(authenticate);

// GET  /api/firms — admin or member with manage_firms
router.get('/', requirePermission('manage_firms'), listFirms);

// POST /api/firms — admin or member with manage_firms
router.post('/', requirePermission('manage_firms'), createFirmValidation, createFirm);

// GET  /api/firms/:id — admin or member with manage_firms
router.get('/:id', requirePermission('manage_firms'), getFirm);

// PATCH /api/firms/:id — admin or member with manage_firms
router.patch('/:id', requirePermission('manage_firms'), updateFirmValidation, updateFirm);

// DELETE /api/firms/:id — admin only
router.delete('/:id', requireAdmin, deleteFirm);

export default router;
