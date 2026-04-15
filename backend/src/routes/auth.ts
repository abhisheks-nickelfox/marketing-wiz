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
import {
  validateOnboardingToken,
  completeOnboarding,
  validateTokenValidation,
  completeOnboardingValidation,
} from '../controllers/onboarding.controller';

const router = Router();

// POST /api/auth/login
router.post('/login', loginValidation, login);

// POST /api/auth/logout  (token required to invalidate server-side session)
router.post('/logout', authenticate, logout);

// GET /api/auth/me
router.get('/me', authenticate, me);

// PATCH /api/auth/profile
router.patch('/profile', authenticate, updateProfileValidation, updateProfile);

// ── Onboarding (public — no auth required) ───────────────────────────────────

// GET /api/auth/onboarding/validate?token=…
router.get('/onboarding/validate', validateTokenValidation, validateOnboardingToken);

// POST /api/auth/onboarding/complete
router.post('/onboarding/complete', completeOnboardingValidation, completeOnboarding);

export default router;
