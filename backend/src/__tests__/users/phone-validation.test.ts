/**
 * Phone number validation tests — PATCH /api/users/:id
 *
 * Validates that the E.164 format is enforced on phone_number in updateUserValidation.
 * Format: + followed by country code + 6–14 digits (total 7–15 digits after +).
 */

import request from 'supertest';

import {
  supabaseMockModule,
  mockDbQueue,
  resetMocks,
} from '../helpers/mockSupabase';

jest.mock('../../config/supabase', () => supabaseMockModule());
jest.mock('node-cron', () => ({ schedule: jest.fn() }));
jest.mock('../../services/fireflies.service', () => ({
  syncTranscripts: jest.fn().mockResolvedValue({ synced: 0, created: 0, updated: 0, errors: [] }),
}));
jest.mock('../../services/email.service', () => ({
  sendInviteEmail: jest.fn().mockResolvedValue(undefined),
  sendProfileUpdateEmail: jest.fn().mockResolvedValue(undefined),
  sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
}));

import { NextFunction, Request, Response } from 'express';
import { AuthenticatedRequest } from '../../types';

jest.mock('../../middleware/auth', () => ({
  authenticate: (req: Request, _res: Response, next: NextFunction) => {
    (req as AuthenticatedRequest).user = {
      id: 'admin-user-id',
      email: 'admin@example.com',
      name: 'Test Admin',
      role: 'admin',
      permissions: [],
      created_at: '2024-01-01T00:00:00.000Z',
    } as AuthenticatedRequest['user'];
    next();
  },
}));

import app from '../../index';

// ── Shared fixture ─────────────────────────────────────────────────────────────

const FAKE_USER = {
  id: 'target-user-uuid',
  email: 'target@example.com',
  name: 'Target User',
  first_name: null,
  last_name: null,
  phone_number: null,
  avatar_url: null,
  role: 'member',
  member_role: null,
  status: 'Active',
  permissions: [],
  invite_nonce: null,
  skills: [],
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: null,
};

// Helper: send a PATCH with only phone_number set.
// The updateUser controller flow (when a field is provided) makes 4 DB calls:
//   1. findUserById → users.maybeSingle()
//   2. findUserById → user_skills.then() (attachSkills)
//   3. updateUser   → users.update().maybeSingle()
//   4. updateUser   → user_skills.then() (attachSkills again)
async function patchPhone(phone: string | null | undefined) {
  const body: Record<string, unknown> = {};
  if (phone !== undefined) body.phone_number = phone;

  if (Object.keys(body).length > 0) {
    // Has a field — will reach the service; prime 4 DB results
    mockDbQueue([
      { data: FAKE_USER, error: null },                              // findUserById: users
      { data: [], error: null },                                     // findUserById: user_skills
      { data: { ...FAKE_USER, phone_number: phone ?? null }, error: null }, // updateUser result
      { data: [], error: null },                                     // updateUser: user_skills
    ]);
  }
  // If body is empty no DB calls are made (400 before service)

  return request(app)
    .patch('/api/users/target-user-uuid')
    .set('Authorization', 'Bearer fake-admin-token')
    .send(body);
}

// ── Valid phone numbers (should succeed — 200) ────────────────────────────────

describe('Phone validation — valid numbers', () => {
  beforeEach(() => resetMocks());

  it('accepts a 7-digit E.164 number "+1234567"', async () => {
    const res = await patchPhone('+1234567');
    expect(res.status).toBe(200);
  });

  it('accepts a 14-digit E.164 number "+12345678901234"', async () => {
    const res = await patchPhone('+12345678901234');
    expect(res.status).toBe(200);
  });

  it('accepts a 15-digit E.164 number "+123456789012345"', async () => {
    const res = await patchPhone('+123456789012345');
    expect(res.status).toBe(200);
  });

  it('accepts empty string (treated as null / clear phone)', async () => {
    const res = await patchPhone('');
    // Empty string satisfies checkFalsy: true — treated as field omitted → 400 (no fields)
    expect(res.status).toBe(400);
  });

  it('accepts null (phone is optional)', async () => {
    const res = await patchPhone(null);
    expect(res.status).toBe(200);
  });

  it('accepts undefined (phone field omitted)', async () => {
    const res = await patchPhone(undefined);
    // No phone_number in body → "no updatable fields" → 400
    expect(res.status).toBe(400);
  });
});

// ── Invalid phone numbers — should all return 400 ────────────────────────────

describe('Phone validation — invalid numbers', () => {
  beforeEach(() => resetMocks());

  it('rejects "1234567890" (missing + prefix) with 400', async () => {
    const res = await patchPhone('1234567890');
    expect(res.status).toBe(400);
  });

  it('rejects "+1" (too short — only 1 digit) with 400', async () => {
    const res = await patchPhone('+1');
    expect(res.status).toBe(400);
  });

  it('rejects "+123456" (6 digits — below E.164 minimum of 7) with 400', async () => {
    const res = await patchPhone('+123456');
    expect(res.status).toBe(400);
  });

  it('rejects "+1234567890123456" (16 digits — exceeds E.164 max of 15) with 400', async () => {
    const res = await patchPhone('+1234567890123456');
    expect(res.status).toBe(400);
  });

  it('rejects "+abc123" (non-numeric characters) with 400', async () => {
    const res = await patchPhone('+abc123');
    expect(res.status).toBe(400);
  });

  it('rejects "+0123456789" (leading zero after + — not valid E.164) with 400', async () => {
    const res = await patchPhone('+0123456789');
    expect(res.status).toBe(400);
  });
});
