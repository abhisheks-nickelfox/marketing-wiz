import { body, param } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';

// ── Constants ─────────────────────────────────────────────────────────────────

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

const ALLOWED_MIME_TYPES = [
  // Images
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.oasis.opendocument.text',
  'text/plain', 'text/rtf', 'application/rtf',
  // Spreadsheets
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  // Presentations
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // Archives
  'application/zip', 'application/x-zip-compressed',
  'application/x-rar-compressed', 'application/vnd.rar',
];

// ── Shared middleware ─────────────────────────────────────────────────────────

function handleValidation(req: Request, res: Response, next: NextFunction): void {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: errors.array()[0].msg });
    return;
  }
  next();
}

// ── Route validation chains ───────────────────────────────────────────────────

export const listAttachmentsValidation = [
  param('id')
    .trim().notEmpty().withMessage('Project ID is required')
    .isUUID('loose').withMessage('Project ID must be a valid UUID'),
  handleValidation,
];

export const uploadAttachmentValidation = [
  param('id')
    .trim().notEmpty().withMessage('Project ID is required')
    .isUUID('loose').withMessage('Project ID must be a valid UUID'),

  body('file_name')
    .trim().notEmpty().withMessage('file_name is required')
    .isString().withMessage('file_name must be a string')
    .isLength({ max: 255 }).withMessage('file_name must be 255 characters or fewer'),

  body('file_size')
    .notEmpty().withMessage('file_size is required')
    .isInt({ min: 1 }).withMessage('file_size must be a positive integer')
    .toInt()
    .custom((v) => {
      if (v > MAX_FILE_SIZE_BYTES) throw new Error(`File too large. Maximum size is ${MAX_FILE_SIZE_BYTES / (1024 * 1024)} MB`);
      return true;
    }),

  body('mime_type')
    .trim().notEmpty().withMessage('mime_type is required')
    .isString().withMessage('mime_type must be a string')
    .custom((v) => {
      if (!ALLOWED_MIME_TYPES.includes(v)) {
        throw new Error(`File type "${v}" is not allowed. Allowed types: images, PDF, Word, Excel, CSV, ZIP`);
      }
      return true;
    }),

  body('data')
    .notEmpty().withMessage('data (base64) is required')
    .isString().withMessage('data must be a base64 string')
    .custom((v) => {
      // Strip data URL prefix if present, then validate base64 charset
      const raw = typeof v === 'string' ? v.replace(/^data:[^;]+;base64,/, '') : v;
      if (!/^[A-Za-z0-9+/]+=*$/.test(raw)) throw new Error('data must be a valid base64-encoded string');
      return true;
    }),

  handleValidation,
];

export const deleteAttachmentValidation = [
  param('id')
    .trim().notEmpty().withMessage('Project ID is required')
    .isUUID('loose').withMessage('Project ID must be a valid UUID'),
  param('attId')
    .trim().notEmpty().withMessage('Attachment ID is required')
    .isUUID('loose').withMessage('Attachment ID must be a valid UUID'),
  handleValidation,
];
