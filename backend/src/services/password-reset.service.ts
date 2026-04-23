import crypto from 'crypto';
import { RESET_TOKEN_EXPIRY_MS } from '../config/constants';

// ── Password reset token — HMAC-SHA256, 1-hour expiry ─────────────────────────
// Self-validating: no DB storage needed. Format same as invite tokens.

const SECRET =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'dev-reset-secret-changeme';

function b64url(s: string): string {
  return Buffer.from(s, 'utf-8').toString('base64url');
}

function fromB64url(s: string): string {
  return Buffer.from(s, 'base64url').toString('utf-8');
}

function sign(payload: string): string {
  return crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
}

export interface ResetTokenPayload {
  email: string;
  exp:   number;
}

/** Generates a signed password reset token valid for RESET_TOKEN_EXPIRY_MS milliseconds. */
export function generateResetToken(email: string): string {
  const payload = b64url(
    JSON.stringify({ email, exp: Date.now() + RESET_TOKEN_EXPIRY_MS }),
  );
  return `${payload}.${sign(payload)}`;
}

/** Verifies and decodes a reset token. Throws on invalid/expired tokens. */
export function verifyResetToken(token: string): ResetTokenPayload {
  const dotIdx = token.lastIndexOf('.');
  if (dotIdx === -1) throw new Error('Invalid token format');

  const payload = token.slice(0, dotIdx);
  const sig     = token.slice(dotIdx + 1);

  if (sign(payload) !== sig) throw new Error('Invalid or tampered token');

  let data: ResetTokenPayload;
  try {
    data = JSON.parse(fromB64url(payload)) as ResetTokenPayload;
  } catch {
    throw new Error('Malformed token payload');
  }

  if (Date.now() > data.exp) {
    throw new Error('Reset link has expired. Please request a new one.');
  }

  return data;
}
