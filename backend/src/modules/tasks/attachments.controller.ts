import { randomUUID } from 'crypto';
import logger from '../../config/logger';
import { Response } from 'express';
import { AuthenticatedRequest } from '../../types';
import { Ticket, TaskAttachment } from '../../models';
import { ADMIN_ROLES } from '../../config/constants';
import { uploadFileBuffer, deleteFromS3, isS3Configured } from '../../config/storage';

// ─── GET /api/tasks/:id/attachments ──────────────────────────────────────────

export async function listAttachments(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id: taskId } = req.params;

  try {
    // Verify the task exists and enforce member-scoped access
    const task = await Ticket.findByPk(taskId, {
      attributes: ['id', 'assignee_id'],
      raw: true,
    }) as { id: string; assignee_id: string | null } | null;

    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    // Members can only view attachments on their own assigned tasks
    if (req.user!.role === 'member' && task.assignee_id !== req.user!.id) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const attachments = await TaskAttachment.findAll({
      where: { task_id: taskId },
      attributes: ['id', 'task_id', 'uploaded_by', 'file_name', 'file_size', 'mime_type', 'storage_url', 'created_at'],
      order: [['created_at', 'ASC']],
      raw: true,
    });

    res.json({ data: attachments });
  } catch (err) {
    logger.error('[attachments.controller] listAttachments error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── POST /api/tasks/:id/attachments ─────────────────────────────────────────

export async function uploadAttachment(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id: taskId } = req.params;
  const { file_name, file_size, mime_type, data: base64Data } = req.body as {
    file_name?: string;
    file_size?: number;
    mime_type?: string;
    data?: string;
  };

  // Input validation
  if (!file_name || typeof file_name !== 'string' || file_name.trim() === '') {
    res.status(400).json({ error: 'file_name is required' });
    return;
  }
  if (file_size == null || typeof file_size !== 'number' || file_size <= 0) {
    res.status(400).json({ error: 'file_size must be a positive number' });
    return;
  }
  if (!mime_type || typeof mime_type !== 'string' || mime_type.trim() === '') {
    res.status(400).json({ error: 'mime_type is required' });
    return;
  }
  if (!base64Data || typeof base64Data !== 'string' || base64Data.trim() === '') {
    res.status(400).json({ error: 'data (base64-encoded file content) is required' });
    return;
  }

  try {
    // Verify the task exists
    const task = await Ticket.findByPk(taskId, {
      attributes: ['id', 'assignee_id'],
      raw: true,
    }) as { id: string; assignee_id: string | null } | null;

    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    // Members may only upload attachments to their own tasks
    if (req.user!.role === 'member' && task.assignee_id !== req.user!.id) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    // Decode the raw base64 string (caller sends plain base64, no data-URL prefix)
    let fileBuffer: Buffer;
    try {
      fileBuffer = Buffer.from(base64Data, 'base64');
    } catch {
      res.status(400).json({ error: 'Invalid base64 data' });
      return;
    }

    // Build a unique but human-readable storage key
    const uniqueId = randomUUID();
    const sanitizedName = file_name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storageKey = `attachments/${taskId}/${uniqueId}_${sanitizedName}`;

    // Upload to S3 (or fall back to data URL in local dev)
    const storageUrl = await uploadFileBuffer(storageKey, fileBuffer, mime_type);

    // Persist the attachment record
    const attachment = await TaskAttachment.create({
      task_id: taskId,
      uploaded_by: req.user!.id,
      file_name: file_name.trim(),
      file_size,
      mime_type: mime_type.trim(),
      storage_url: storageUrl,
    });

    res.status(201).json({ data: attachment.toJSON() });
  } catch (err) {
    logger.error('[attachments.controller] uploadAttachment error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── DELETE /api/tasks/:id/attachments/:attId ─────────────────────────────────

export async function deleteAttachment(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id: taskId, attId } = req.params;

  try {
    // Fetch the attachment — confirms existence and task membership
    const attachment = await TaskAttachment.findOne({
      where: { id: attId, task_id: taskId },
      attributes: ['id', 'task_id', 'uploaded_by', 'storage_url'],
      raw: true,
    }) as { id: string; task_id: string; uploaded_by: string; storage_url: string } | null;

    if (!attachment) {
      res.status(404).json({ error: 'Attachment not found' });
      return;
    }

    // Only the uploader or an admin/super_admin may delete an attachment
    const isAdmin = ADMIN_ROLES.includes(req.user!.role);
    const isOwner = attachment.uploaded_by === req.user!.id;

    if (!isAdmin && !isOwner) {
      res.status(403).json({ error: 'Access denied — only the uploader or an admin can delete this attachment' });
      return;
    }

    // Delete from S3 when configured.
    // Storage URL for S3 objects: https://<bucket>.s3.<region>.amazonaws.com/<key>
    // Extract the key from the URL so we don't need to store it separately.
    if (isS3Configured()) {
      try {
        const s3KeyMatch = attachment.storage_url.match(/amazonaws\.com\/(.+)$/);
        if (s3KeyMatch?.[1]) {
          await deleteFromS3(s3KeyMatch[1]);
        } else {
          logger.warn('[attachments.controller] deleteAttachment: could not extract S3 key from URL:', attachment.storage_url);
        }
      } catch (s3Err) {
        // Log but don't fail the request — DB row deletion is the authoritative step
        logger.error('[attachments.controller] deleteAttachment S3 error:', s3Err);
      }
    }

    // Remove the DB record
    await TaskAttachment.destroy({ where: { id: attId } });

    res.json({ deleted: true });
  } catch (err) {
    logger.error('[attachments.controller] deleteAttachment error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
