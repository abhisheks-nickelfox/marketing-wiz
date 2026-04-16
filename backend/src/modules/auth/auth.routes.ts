import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import {
  loginValidation,
  updateProfileValidation,
  validateTokenValidation,
  completeOnboardingValidation,
  uploadAvatarValidation,
} from './auth.validation';
import * as authController from './auth.controller';
import * as onboardingController from './onboarding.controller';

const router = Router();

// POST /api/auth/login — public
router.post('/login', loginValidation, authController.login);

// POST /api/auth/logout — requires authentication
router.post('/logout', authenticate, authController.logout);

// GET /api/auth/me — requires authentication
router.get('/me', authenticate, authController.me);

// PATCH /api/auth/profile — requires authentication
router.patch('/profile', authenticate, updateProfileValidation, authController.updateProfile);

// ── Onboarding (public — no auth required) ───────────────────────────────────

// GET /api/auth/onboarding/validate?token=…
router.get('/onboarding/validate', validateTokenValidation, onboardingController.validateOnboardingToken);

// POST /api/auth/onboarding/complete
router.post('/onboarding/complete', completeOnboardingValidation, onboardingController.completeOnboarding);

// POST /api/auth/onboarding/avatar
router.post('/onboarding/avatar', uploadAvatarValidation, onboardingController.uploadOnboardingAvatar);

export default router;
