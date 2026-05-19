import { Response } from 'express';
import logger from '../../config/logger';

// ── Channel Registry ──────────────────────────────────────────────────────────
//
// Maps a channel key ("scope:scopeId", e.g. "firm:abc123") to all currently
// open SSE Response objects for that channel. When a message is created we
// call broadcast() which writes the event to every connected client instantly.
//
// This is process-local — fine for a single-server deployment. If you scale to
// multiple processes you would swap this for Redis Pub/Sub.

type Channel = Set<Response>;
const registry = new Map<string, Channel>();

// ── Typing Timer Registry ─────────────────────────────────────────────────────
//
// Tracks per-user typing timers. Key = "scope:scopeId:userId".
// Each typing heartbeat from the client (re)starts a 4-second timer.
// When the timer fires we auto-broadcast typing_stop — no client cleanup needed.

const typingTimers = new Map<string, ReturnType<typeof setTimeout>>();

export function channelKey(scope: string, scopeId: string): string {
  return `${scope}:${scopeId}`;
}

// Register a new SSE client for a channel. Returns a cleanup function that
// removes the client when the connection closes.
export function subscribe(scope: string, scopeId: string, res: Response): () => void {
  const key = channelKey(scope, scopeId);

  if (!registry.has(key)) {
    registry.set(key, new Set());
  }
  registry.get(key)!.add(res);

  logger.debug(`[sse] +1 subscriber on ${key} (total: ${registry.get(key)!.size})`);

  return () => {
    const ch = registry.get(key);
    if (ch) {
      ch.delete(res);
      if (ch.size === 0) registry.delete(key);
    }
    logger.debug(`[sse] -1 subscriber on ${key}`);
  };
}

// Push a notification_update event to all SSE clients for a specific user.
// Used by the notifications module to push real-time inbox updates.
export function broadcastToUser(userId: string, payload: unknown): void {
  broadcast('user', userId, payload);
}

// Push a JSON payload to every client listening on the given channel.
export function broadcast(scope: string, scopeId: string, payload: unknown): void {
  const key = channelKey(scope, scopeId);
  const ch  = registry.get(key);
  if (!ch || ch.size === 0) return;

  const data = `data: ${JSON.stringify(payload)}\n\n`;

  for (const res of ch) {
    try {
      res.write(data);
      // Flush immediately so bytes leave the socket without waiting for the
      // buffer to fill. flush() exists when compression middleware is present.
      (res as unknown as { flush?: () => void }).flush?.();
    } catch {
      // Client disconnected mid-write — remove it silently
      ch.delete(res);
    }
  }
}

// Broadcast typing_start and (re)start the 4-second auto-expire timer.
// Called on each typing heartbeat from the frontend (debounced to ~300 ms).
export function broadcastTypingStart(
  scope: string,
  scopeId: string,
  user: { id: string; name: string; avatar_url: string | null },
): void {
  const timerKey = `${channelKey(scope, scopeId)}:${user.id}`;

  // Clear any existing timer so the expiry window resets on each heartbeat
  const existing = typingTimers.get(timerKey);
  if (existing) clearTimeout(existing);

  broadcast(scope, scopeId, { type: 'typing_start', user });

  const timer = setTimeout(() => {
    typingTimers.delete(timerKey);
    broadcast(scope, scopeId, { type: 'typing_stop', user_id: user.id });
  }, 4_000);

  typingTimers.set(timerKey, timer);
}
