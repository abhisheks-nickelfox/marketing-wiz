import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireAdmin, requirePermission } from '../../middleware/rbac';
import { createTranscriptValidation, processValidation } from './transcripts.validation';
import * as transcriptsController from './transcripts.controller';

const router = Router();

// All transcript routes require authentication
router.use(authenticate);

// GET /api/transcripts — requires process_transcripts permission
router.get('/', requirePermission('process_transcripts'), transcriptsController.listTranscripts);

// POST /api/transcripts (manual creation — must be before /:id param routes)
router.post('/', requirePermission('process_transcripts'), createTranscriptValidation, transcriptsController.createTranscript);

// POST /api/transcripts/sync — admin only
router.post('/sync', requireAdmin, transcriptsController.syncTranscriptsHandler);

// PATCH /api/transcripts/:id/archive
router.patch('/:id/archive', requirePermission('process_transcripts'), transcriptsController.toggleArchive);

// POST /api/transcripts/:id/process
router.post('/:id/process', requirePermission('process_transcripts'), processValidation, transcriptsController.processTranscript);

export default router;
