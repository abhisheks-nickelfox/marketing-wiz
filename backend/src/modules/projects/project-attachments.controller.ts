import { randomUUID } from 'crypto';
import { Response } from 'express';
import { validationResult } from 'express-validator';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { sequelize } from '../../config/database';
import logger from '../../config/logger';
import { AuthenticatedRequest } from '../../types';
import { uploadFileBuffer, deleteFromS3, isS3Configured } from '../../config/storage';

// Presigned URL TTL: 1 hour
const PRESIGN_EXPIRES = 3600;

function getS3Client() {
  return new S3Client({
    region: process.env.AWS_REGION ?? 'us-east-1',
    credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
      ? { accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY }
      : undefined,
  });
}

function extractS3Key(fileUrl: string): string | null {
  const match = fileUrl.match(/amazonaws\.com\/(.+)$/);
  return match?.[1] ?? null;
}

async function presignAttachments(attachments: any[]): Promise<any[]> {
  if (!isS3Configured()) return attachments;
  const client = getS3Client();
  const bucket = process.env.AWS_S3_BUCKET!;
  return Promise.all(attachments.map(async (att) => {
    const key = extractS3Key(att.file_url);
    if (!key) return att;
    try {
      const url = await getSignedUrl(
        client,
        new GetObjectCommand({ Bucket: bucket, Key: key }),
        { expiresIn: PRESIGN_EXPIRES },
      );
      return { ...att, file_url: url };
    } catch {
      return att;
    }
  }));
}

// ─── GET /api/projects/:id/attachments ───────────────────────────────────────

export async function listProjectAttachments(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id: projectId } = req.params;
  try {
    const attachments = await sequelize.query(
      `SELECT pa.id, pa.project_id, pa.file_url, pa.file_name, pa.file_size, pa.file_type,
              pa.uploaded_by, pa.created_at,
              u.name AS uploader_name, u.avatar_url AS uploader_avatar
       FROM project_attachments pa
       LEFT JOIN users u ON u.id = pa.uploaded_by
       WHERE pa.project_id = :projectId
       ORDER BY pa.created_at ASC`,
      { replacements: { projectId }, type: 'SELECT' as any },
    ) as unknown as any[];
    const signed = await presignAttachments(attachments);
    res.json({ data: signed });
  } catch (err) {
    logger.error('[project-attachments] listProjectAttachments error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── POST /api/projects/:id/attachments ──────────────────────────────────────

export async function uploadProjectAttachment(req: AuthenticatedRequest, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: errors.array()[0].msg });
    return;
  }

  const { id: projectId } = req.params;
  const { file_name, file_size, mime_type, data: base64Data } = req.body as {
    file_name: string;
    file_size: number;
    mime_type: string;
    data: string;
  };

  try {
    const rows = await sequelize.query(
      'SELECT id FROM projects WHERE id = :projectId',
      { replacements: { projectId }, type: 'SELECT' as any },
    ) as unknown as any[];
    if (!rows.length) {
      res.status(404).json({ error: 'Project not found' }); return;
    }

    const fileBuffer = Buffer.from(base64Data.replace(/^data:[^;]+;base64,/, ''), 'base64');

    const uniqueId = randomUUID();
    const sanitizedName = file_name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storageKey = `project-attachments/${projectId}/${uniqueId}_${sanitizedName}`;
    const fileUrl = await uploadFileBuffer(storageKey, fileBuffer, mime_type);

    const attId = randomUUID();
    await sequelize.query(
      `INSERT INTO project_attachments (id, project_id, file_url, file_name, file_size, file_type, uploaded_by, created_at)
       VALUES (:id, :projectId, :fileUrl, :fileName, :fileSize, :fileType, :uploadedBy, NOW())`,
      {
        replacements: {
          id: attId,
          projectId,
          fileUrl,
          fileName: file_name.trim(),
          fileSize: file_size,
          fileType: mime_type.trim(),
          uploadedBy: req.user!.id,
        },
      },
    );

    const attachmentRows = await sequelize.query(
      `SELECT pa.*, u.name AS uploader_name, u.avatar_url AS uploader_avatar
       FROM project_attachments pa
       LEFT JOIN users u ON u.id = pa.uploaded_by
       WHERE pa.id = :id`,
      { replacements: { id: attId }, type: 'SELECT' as any },
    ) as unknown as any[];

    const [signed] = await presignAttachments([attachmentRows[0]]);
    res.status(201).json({ data: signed });
  } catch (err) {
    logger.error('[project-attachments] uploadProjectAttachment error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── DELETE /api/projects/:id/attachments/:attId ──────────────────────────────

export async function deleteProjectAttachment(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id: projectId, attId } = req.params;

  try {
    const attachRows = await sequelize.query(
      'SELECT id, project_id, uploaded_by, file_url FROM project_attachments WHERE id = :attId AND project_id = :projectId',
      { replacements: { attId, projectId }, type: 'SELECT' as any },
    ) as unknown as any[];
    const attachment = attachRows[0];

    if (!attachment) {
      res.status(404).json({ error: 'Attachment not found' }); return;
    }

    const isAdmin = ['admin', 'project_manager'].includes(req.user!.role);
    const isOwner = attachment.uploaded_by === req.user!.id;
    if (!isAdmin && !isOwner) {
      res.status(403).json({ error: 'Access denied' }); return;
    }

    if (isS3Configured()) {
      try {
        const s3KeyMatch = attachment.file_url.match(/amazonaws\.com\/(.+)$/);
        if (s3KeyMatch?.[1]) await deleteFromS3(s3KeyMatch[1]);
      } catch (s3Err) {
        logger.error('[project-attachments] S3 delete error:', s3Err);
      }
    }

    await sequelize.query(
      'DELETE FROM project_attachments WHERE id = :attId',
      { replacements: { attId } },
    );

    res.json({ deleted: true });
  } catch (err) {
    logger.error('[project-attachments] deleteProjectAttachment error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
