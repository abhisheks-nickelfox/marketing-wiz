/**
 * Phone number validation tests — PATCH /api/users/:id
 *
 * Validates E.164 format on phone_number in updateUserValidation.
 * Format: + followed by non-zero country code + 6–14 more digits (total 7–15 after +).
 */

import request from 'supertest';

jest.mock('../../models', () => require('../helpers/mockModels').mockModelsModule());
jest.mock('../../models/index', () => require('../helpers/mockModels').mockModelsModule());
jest.mock('node-cron', () => ({ schedule: jest.fn() }));
jest.mock('../../services/fireflies.service', () => ({
  syncTranscripts: jest.fn().mockResolvedValue({ synced: 0, created: 0, updated: 0, errors: [] }),
}));
jest.mock('../../config/database', () => ({
  __esModule: true,
  default: { authenticate: jest.fn(), sync: jest.fn() },
  connectDB: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../services/email.service', () => ({
  sendInviteEmail:        jest.fn().mockResolvedValue(undefined),
  sendProfileUpdateEmail: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../modules/notifications/notifications.service', () => ({
  notifyUser: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../middleware/auth', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.user = {
      id: 'admin-user-id', email: 'admin@example.com',
      name: 'Test Admin', role: 'admin', permissions: [],
      created_at: '2024-01-01T00:00:00.000Z',
    };
    next();
  },
}));

import { MockUser, MockUserSkill, resetAllMocks } from '../helpers/mockModels';
import app from '../../index';

const FAKE_USER = {
  id: 'target-user-uuid', email: 'target@example.com',
  name: 'Target User', first_name: null, last_name: null,
  phone_number: null, avatar_url: null, role: 'member',
  member_role: null, status: 'Active', permissions: [],
  invite_nonce: null, created_at: '2024-01-01T00:00:00Z', updated_at: null,
};

async function patchPhone(phone: string | null | undefined) {
  const body: Record<string, unknown> = {};
  if (phone !== undefined) body.phone_number = phone;

  const hasField = Object.keys(body).length > 0;

  if (hasField) {
    // Controller calls findUserById (before) then updateUser which calls findUserById (after)
    // Before: findByPk + UserSkill.findAll
    MockUser.findByPk.mockResolvedValueOnce(FAKE_USER);
    MockUserSkill.findAll.mockResolvedValueOnce([]);
    // updateUser: User.update
    MockUser.update.mockResolvedValueOnce([1]);
    // updateUser → findUserById (after): findByPk + UserSkill.findAll
    MockUser.findByPk.mockResolvedValueOnce({ ...FAKE_USER, phone_number: phone ?? null });
    MockUserSkill.findAll.mockResolvedValueOnce([]);
  }

  return request(app)
    .patch('/api/users/target-user-uuid')
    .set('Authorization', 'Bearer fake-admin-token')
    .send(body);
}

// ── Valid phone numbers ───────────────────────────────────────────────────────

describe('Phone validation — valid numbers', () => {
  beforeEach(() => resetAllMocks());

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

  it('accepts empty string — converted to null phone number', async () => {
    const res = await patchPhone('');
    expect(res.status).toBe(200);
  });

  it('accepts null (clears phone number)', async () => {
    const res = await patchPhone(null);
    expect(res.status).toBe(200);
  });

  it('rejects undefined (no fields provided) → 400', async () => {
    const res = await patchPhone(undefined);
    expect(res.status).toBe(400);
  });
});

// ── Invalid phone numbers ─────────────────────────────────────────────────────

describe('Phone validation — invalid numbers', () => {
  beforeEach(() => resetAllMocks());

  it('rejects "1234567890" (missing + prefix)', async () => {
    const res = await patchPhone('1234567890');
    expect(res.status).toBe(400);
  });

  it('rejects "+1" (too short)', async () => {
    const res = await patchPhone('+1');
    expect(res.status).toBe(400);
  });

  it('rejects "+123456" (6 digits — below E.164 minimum of 7)', async () => {
    const res = await patchPhone('+123456');
    expect(res.status).toBe(400);
  });

  it('rejects "+1234567890123456" (16 digits — exceeds E.164 max)', async () => {
    const res = await patchPhone('+1234567890123456');
    expect(res.status).toBe(400);
  });

  it('rejects "+abc123" (non-numeric)', async () => {
    const res = await patchPhone('+abc123');
    expect(res.status).toBe(400);
  });

  it('rejects "+0123456789" (leading zero after +)', async () => {
    const res = await patchPhone('+0123456789');
    expect(res.status).toBe(400);
  });
});
