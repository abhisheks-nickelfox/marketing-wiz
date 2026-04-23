import crypto from 'crypto';
import { INVITE_TOKEN_EXPIRY_MS } from '../config/constants';

// ── Invite token — signed with HMAC-SHA256, 24-hour expiry ────────────────────
// Format: base64url(payload) + '.' + base64url(hmac-sha256-signature)
// '.' is not a valid base64url character, so splitting on it is unambiguous.

const SECRET =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'dev-invite-secret-changeme';

function b64url(s: string): string {
  return Buffer.from(s, 'utf-8').toString('base64url');
}

function fromB64url(s: string): string {
  return Buffer.from(s, 'base64url').toString('utf-8');
}

function sign(payload: string): string {
  return crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
}

// ── Public interface ──────────────────────────────────────────────────────────

export interface InviteTokenPayload {
  userId: string;
  email: string;
  exp: number;
  /** Random nonce stored in users.invite_nonce — re-inviting rotates this,
   *  immediately invalidating any previously issued link. */
  nonce: string;
}

/** Generates a signed invite token valid for INVITE_TOKEN_EXPIRY_MS milliseconds.
 *  `nonce` must have been stored in users.invite_nonce before calling this. */
export function generateInviteToken(userId: string, email: string, nonce: string): string {
  const payload = b64url(
    JSON.stringify({ userId, email, exp: Date.now() + INVITE_TOKEN_EXPIRY_MS, nonce }),
  );
  return `${payload}.${sign(payload)}`;
}

/** Verifies and decodes an invite token.  Throws on invalid/expired tokens. */
export function verifyInviteToken(token: string): InviteTokenPayload {
  const dotIdx = token.lastIndexOf('.');
  if (dotIdx === -1) throw new Error('Invalid token format');

  const payload = token.slice(0, dotIdx);
  const sig = token.slice(dotIdx + 1);

  if (sign(payload) !== sig) throw new Error('Invalid or tampered token');

  let data: InviteTokenPayload;
  try {
    data = JSON.parse(fromB64url(payload)) as InviteTokenPayload;
  } catch {
    throw new Error('Malformed token payload');
  }

  if (Date.now() > data.exp) {
    throw new Error('Invite link has expired. Please ask an admin to resend it.');
  }

  return data;
}
