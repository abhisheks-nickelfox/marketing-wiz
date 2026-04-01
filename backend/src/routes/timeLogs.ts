// Time-log routes are mounted as a sub-resource of tickets in routes/tickets.ts.
// This file is kept as a re-export stub so the project structure matches the spec
// and future standalone time-log endpoints (e.g. GET /api/time-logs for admin)
// can be added here without restructuring the router.

import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireMember } from '../middleware/rbac';
import { listTimeLogs, createTimeLog, createTimeLogValidation } from '../controllers/timeLogs.controller';

const router = Router({ mergeParams: true });

router.use(authenticate, requireMember);

router.get('/', listTimeLogs);
router.post('/', createTimeLogValidation, createTimeLog);

export default router;
