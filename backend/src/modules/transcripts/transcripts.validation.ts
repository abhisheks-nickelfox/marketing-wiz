import { body, param } from 'express-validator';

const MIN_TRANSCRIPT_WORDS = 50;

export const createTranscriptValidation = [
  body('title').trim().notEmpty().withMessage('title is required'),
  body('call_date').trim().notEmpty().withMessage('call_date is required'),
  body('raw_transcript')
    .trim()
    .notEmpty().withMessage('raw_transcript is required')
    .custom((v: string) => {
      const wordCount = v.trim().split(/\s+/).filter(Boolean).length;
      if (wordCount < MIN_TRANSCRIPT_WORDS) {
        throw new Error(
          `Transcript is too short (${wordCount} word${wordCount === 1 ? '' : 's'}). ` +
          `Minimum ${MIN_TRANSCRIPT_WORDS} words required to generate meaningful tickets.`
        );
      }
      return true;
    }),
  body('duration_sec')
    .optional({ nullable: true })
    .customSanitizer((v) => (v === '' || v === null || v === undefined ? 0 : Number(v)))
    .isFloat({ min: 0 })
    .withMessage('duration_sec must be a non-negative number'),
  body('participants')
    .optional({ nullable: true })
    .customSanitizer((v) => (Array.isArray(v) ? v : []))
    .isArray()
    .withMessage('participants must be an array'),
  body('firm_id')
    .customSanitizer((v) => (v && typeof v === 'string' && v.trim() ? v.trim() : undefined))
    .optional()
    .custom((v) => !v || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v))
    .withMessage('firm_id must be a valid UUID'),
];

export const processValidation = [
  param('id').isUUID('loose').withMessage('Invalid transcript ID'),
  body('firm_id').isUUID('loose').withMessage('firm_id must be a valid UUID'),
  body('prompt_id').isUUID('loose').withMessage('prompt_id must be a valid UUID'),
  body('text_notes').optional().isString(),
];
