import logger from '../../config/logger';
import { Response } from 'express';
import { validationResult } from 'express-validator';
import { AuthenticatedRequest } from '../../types';
import { ADMIN_ROLES } from '../../config/constants';
import { User } from '../../models';
import { verifyToken } from '../../config/auth';
import * as messagesService from './messages.service';
import { subscribe, broadcast } from './sse';
import { Message } from '../../models';
import type { CreateMessageDto } from './dto/create-message.dto';

// Fetch message scope+scope_id then broadcast reaction update — fire and forget
async function broadcastReaction(messageId: string, reactions: unknown) {
  try {
    const msg = await Message.findByPk(messageId, { attributes: ['scope', 'scope_id'], raw: true }) as unknown as { scope: string; scope_id: string } | null;
    if (msg) broadcast(msg.scope, msg.scope_id, { type: 'reaction_updated', message_id: messageId, reactions });
  } catch { /* non-critical */ }
}

// ── GET /api/messages?scope=X&scope_id=Y ─────────────────────────────────────

export async function listMessages(req: AuthenticatedRequest, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: 'Validation failed', details: errors.array() });
    return;
  }

  const { scope, scope_id } = req.query as { scope: string; scope_id: string };

  try {
    const messages = await messagesService.getMessages(scope, scope_id);
    res.json({ data: messages });
  } catch (err) {
    logger.error('[messages.controller] listMessages error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ── POST /api/messages ────────────────────────────────────────────────────────

export async function createMessage(req: AuthenticatedRequest, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: 'Validation failed', details: errors.array() });
    return;
  }

  try {
    const message = await messagesService.createMessage(req.user!.id, req.body as CreateMessageDto);
    res.status(201).json({ data: message });
    // Push to all SSE clients watching this channel — fire and forget
    broadcast(message.scope, message.scope_id, { type: 'new_message', payload: message });
  } catch (err) {
    logger.error('[messages.controller] createMessage error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ── GET /api/messages/stream?scope=X&scope_id=Y&token=Z ──────────────────────
//
// SSE endpoint. EventSource cannot set custom headers, so the JWT is passed as
// a query parameter instead of an Authorization header. We verify it manually.
//
// The connection is kept open indefinitely. A heartbeat comment is sent every
// 30 seconds so proxies/load balancers don't close the idle connection.

export async function streamMessages(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { scope, scope_id, token } = req.query as { scope?: string; scope_id?: string; token?: string };

  // ── Auth: verify token from query param ────────────────────────────────────
  if (!token) {
    res.status(401).json({ error: 'Missing token' });
    return;
  }
  let userId: string;
  try {
    const payload = verifyToken(token);
    userId = payload.sub;
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }
  const profile = await User.findByPk(userId, { raw: true });
  if (!profile) {
    res.status(401).json({ error: 'User not found' });
    return;
  }

  // ── Validate scope params ──────────────────────────────────────────────────
  if (!scope || !scope_id) {
    res.status(400).json({ error: 'scope and scope_id are required' });
    return;
  }

  // ── Open SSE stream ────────────────────────────────────────────────────────
  res.setHeader('Content-Type',  'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection',    'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // disable Nginx buffering
  res.flushHeaders();

  // Helper: write + flush immediately so bytes leave the socket right away
  // (res.flush exists when compression middleware is present; safe to call either way)
  const send = (data: string) => {
    res.write(data);
    (res as unknown as { flush?: () => void }).flush?.();
  };

  // Send an initial "connected" event so the client knows the stream is live
  send(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);

  // Register this client in the channel registry
  const unsubscribe = subscribe(scope, scope_id, res);

  // Heartbeat every 30 seconds — keeps connection alive through proxies
  const heartbeat = setInterval(() => {
    send(': heartbeat\n\n');
  }, 30_000);

  // Cleanup when the client disconnects (browser tab closed, navigation, etc.)
  req.on('close', () => {
    clearInterval(heartbeat);
    unsubscribe();
  });
}

// ── POST /api/messages/:id/reactions ─────────────────────────────────────────

export async function addReaction(req: AuthenticatedRequest, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: 'Validation failed', details: errors.array() });
    return;
  }

  const { id } = req.params;
  const { emoji } = req.body as { emoji: string };

  try {
    const reactions = await messagesService.addReaction(id, req.user!.id, emoji);
    res.json({ data: reactions });
    // Fetch message scope to broadcast reaction update to the right channel
    broadcastReaction(id, reactions);
  } catch (err) {
    logger.error('[messages.controller] addReaction error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ── DELETE /api/messages/:id/reactions ───────────────────────────────────────

export async function removeReaction(req: AuthenticatedRequest, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: 'Validation failed', details: errors.array() });
    return;
  }

  const { id } = req.params;
  const { emoji } = req.body as { emoji: string };

  try {
    const reactions = await messagesService.removeReaction(id, req.user!.id, emoji);
    res.json({ data: reactions });
    broadcastReaction(id, reactions);
  } catch (err) {
    logger.error('[messages.controller] removeReaction error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ── POST /api/messages/read ───────────────────────────────────────────────────

export async function markRead(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { scope, scope_id } = req.body as { scope?: string; scope_id?: string };

  if (!scope || !scope_id) {
    res.status(400).json({ error: 'scope and scope_id are required' });
    return;
  }

  try {
    const newlyRead = await messagesService.markRead(scope, scope_id, req.user!.id);
    res.json({ marked: newlyRead.length });

    if (newlyRead.length > 0) {
      // Tell all SSE clients on this channel whose messages just got blue ticks
      broadcast(scope, scope_id, {
        type:       'messages_read',
        reader_id:  req.user!.id,
        message_ids: newlyRead,
      });
    }
  } catch (err) {
    logger.error('[messages.controller] markRead error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ── DELETE /api/messages/:id ──────────────────────────────────────────────────

export async function deleteMessage(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;

  const isAdmin = ADMIN_ROLES.includes(req.user!.role as 'admin');

  try {
    const { scope, scope_id } = await messagesService.deleteMessage(id, req.user!.id, isAdmin);
    res.json({ message: 'Message deleted' });
    broadcast(scope, scope_id, { type: 'message_deleted', message_id: id });
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    if (e.statusCode === 404) {
      res.status(404).json({ error: e.message });
      return;
    }
    if (e.statusCode === 403) {
      res.status(403).json({ error: e.message });
      return;
    }
    logger.error('[messages.controller] deleteMessage error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
