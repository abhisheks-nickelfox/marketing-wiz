import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  login,
  logout,
  me,
  updateProfile,
  loginValidation,
  updateProfileValidation,
} from '../controllers/auth.controller';

const router = Router();

// POST /api/auth/login
router.post('/login', loginValidation, login);

// POST /api/auth/logout  (token required to invalidate server-side session)
router.post('/logout', authenticate, logout);

// GET /api/auth/me
router.get('/me', authenticate, me);

// PATCH /api/auth/profile
router.patch('/profile', authenticate, updateProfileValidation, updateProfile);

export default router;
