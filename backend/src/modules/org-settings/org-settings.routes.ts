import { Router } from 'express';

import { authenticate } from '../../middleware/auth';
import { requireAdmin } from '../../middleware/rbac';
import * as orgSettingsController from './org-settings.controller';

const router = Router();

// GET  /api/org-settings      — public: needed on login/onboarding before user has a JWT
router.get('/', orgSettingsController.getOrgSettings);

// POST /api/org-settings/logo — admin only: upload / replace the org logo
router.post('/logo', authenticate, requireAdmin, orgSettingsController.uploadOrgLogo);

export default router;
