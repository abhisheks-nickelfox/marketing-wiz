import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireAdmin, requirePermission } from '../middleware/rbac';
import {
  listTranscripts,
  createTranscript,
  createTranscriptValidation,
  syncTranscriptsHandler,
  toggleArchive,
  processTranscript,
  processValidation,
} from '../controllers/transcripts.controller';

const router = Router();

router.use(authenticate);

// GET /api/transcripts — admin or member with process_transcripts
router.get('/', requirePermission('process_transcripts'), listTranscripts);

// POST /api/transcripts (manual creation — must be before /:id param routes)
router.post('/', requirePermission('process_transcripts'), createTranscriptValidation, createTranscript);

// POST /api/transcripts/sync — admin only
router.post('/sync', requireAdmin, syncTranscriptsHandler);

// PATCH /api/transcripts/:id/archive — admin or member with process_transcripts
router.patch('/:id/archive', requirePermission('process_transcripts'), toggleArchive);

// POST /api/transcripts/:id/process — admin or member with process_transcripts
router.post('/:id/process', requirePermission('process_transcripts'), processValidation, processTranscript);

export default router;
