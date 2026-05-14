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
