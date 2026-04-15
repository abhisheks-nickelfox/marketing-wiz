import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireAdmin } from '../../middleware/rbac';
import { createMemberRoleValidation } from './member-roles.validation';
import * as memberRolesController from './member-roles.controller';

const router = Router();

router.get('/',    authenticate, memberRolesController.listMemberRoles);
router.post('/',   authenticate, requireAdmin, createMemberRoleValidation, memberRolesController.createMemberRole);
router.delete('/:id', authenticate, requireAdmin, memberRolesController.deleteMemberRole);

export default router;
