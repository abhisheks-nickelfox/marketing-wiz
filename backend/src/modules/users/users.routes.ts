import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireAdmin } from '../../middleware/rbac';
import {
  createUserValidation,
  updateUserValidation,
  uploadAvatarValidation,
} from './users.validation';
import * as usersController from './users.controller';

const router = Router();

// GET  /api/users        — admin only: list all users with their skills
router.get('/', authenticate, requireAdmin, usersController.listUsers);

// POST /api/users        — admin only: create user + assign skills
router.post('/', authenticate, requireAdmin, createUserValidation, usersController.createUser);

// GET  /api/users/:id    — admin only: fetch a single user with skills
router.get('/:id', authenticate, requireAdmin, usersController.getUser);

// PATCH /api/users/:id   — admin only: update user fields and/or skill set
router.patch('/:id', authenticate, requireAdmin, updateUserValidation, usersController.updateUser);

// POST /api/users/:id/avatar — admin only: upload/replace avatar for a user
router.post('/:id/avatar', authenticate, requireAdmin, uploadAvatarValidation, usersController.uploadUserAvatar);

// POST /api/users/:id/resend-invite — admin only: resend invite to invited user
router.post('/:id/resend-invite', authenticate, requireAdmin, usersController.resendInvite);

// DELETE /api/users/:id  — admin only: delete user (profile + auth)
router.delete('/:id', authenticate, requireAdmin, usersController.deleteUser);

export default router;
