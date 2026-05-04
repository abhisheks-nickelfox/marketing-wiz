import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireAdmin, requireMember } from '../../middleware/rbac';
import { createTaskTypeValidation, updateTaskTypeValidation } from './task-types.validation';
import * as taskTypesController from './task-types.controller';

const router = Router();

router.get('/',     authenticate, requireMember, taskTypesController.listTaskTypes);
router.post('/',    authenticate, requireAdmin,  createTaskTypeValidation, taskTypesController.createTaskType);
router.patch('/:id', authenticate, requireAdmin, updateTaskTypeValidation, taskTypesController.updateTaskType);
router.delete('/:id', authenticate, requireAdmin, taskTypesController.deleteTaskType);

export default router;
