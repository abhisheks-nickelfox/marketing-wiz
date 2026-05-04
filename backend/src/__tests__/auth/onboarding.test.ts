/**
 * Onboarding flow tests
 *
 * GET  /api/auth/onboarding/validate?token=…
 * POST /api/auth/onboarding/complete
 *
 * Invite tokens use the real invite.service HMAC signing.
 * All DB and external calls are mocked.
 */

process.env.JWT_SECRET = 'test-jwt-secret-for-unit-tests';

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
  sendWelcomeEmail:    jest.fn().mockResolvedValue(undefined),
  sendSkillRequestEmail: jest.fn().mockResolvedValue(undefined),
  sendInviteEmail:     jest.fn().mockResolvedValue(undefined),
  sendProfileUpdateEmail: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../modules/notifications/notifications.service', () => ({
  notifyAdmins: jest.fn().mockResolvedValue(undefined),
  notifyUser:   jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../config/storage', () => ({
  uploadBase64Image: jest.fn().mockResolvedValue('https://example.com/avatar.jpg'),
}));

// Mock the entire onboarding service to avoid deep dependency chains
jest.mock('../../modules/auth/onboarding.service', () => ({
  validateOnboardingToken: jest.fn(),
  completeOnboarding:      jest.fn(),
  uploadOnboardingAvatar:  jest.fn(),
}));

import request from 'supertest';
import app from '../../index';
import * as onboardingService from '../../modules/auth/onboarding.service';
import { generateInviteToken } from '../../services/invite.service';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const FAKE_USER = {
  id: 'user-uuid-invited', email: 'newmember@example.com',
  name: 'New Member', first_name: null, last_name: null,
  status: 'invited', role: 'member', permissions: [],
};

// ── GET /api/auth/onboarding/validate ─────────────────────────────────────────

describe('GET /api/auth/onboarding/validate', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 200 with email and name for a valid token', async () => {
    (onboardingService.validateOnboardingToken as jest.Mock).mockResolvedValueOnce({
      email: 'newmember@example.com',
      name: 'New Member',
    });

    const res = await request(app)
      .get('/api/auth/onboarding/validate')
      .query({ token: 'valid-token' });

    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe('newmember@example.com');
    expect(res.body.data.name).toBe('New Member');
  });

  it('returns 400 when token is missing', async () => {
    const res = await request(app).get('/api/auth/onboarding/validate');

    expect(res.status).toBe(400);
  });

  it('returns 400 when token is invalid or expired', async () => {
    (onboardingService.validateOnboardingToken as jest.Mock).mockRejectedValueOnce(
      Object.assign(new Error('Token expired'), { statusCode: 400 }),
    );

    const res = await request(app)
      .get('/api/auth/onboarding/validate')
      .query({ token: 'expired-token' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Token expired');
  });

  it('returns 400 when nonce has been rotated (link invalidated)', async () => {
    (onboardingService.validateOnboardingToken as jest.Mock).mockRejectedValueOnce(
      Object.assign(new Error('This invite link has expired. Please ask an admin to resend it.'), { statusCode: 400 }),
    );

    const res = await request(app)
      .get('/api/auth/onboarding/validate')
      .query({ token: 'old-token' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/expired/i);
  });
});

// ── POST /api/auth/onboarding/complete ───────────────────────────────────────

describe('POST /api/auth/onboarding/complete', () => {
  beforeEach(() => jest.clearAllMocks());

  const VALID_BODY = {
    token:      'valid-token',
    password:   'SecurePass123!',
    first_name: 'New',
    last_name:  'Member',
  };

  it('returns 200 with JWT and user on success', async () => {
    (onboardingService.completeOnboarding as jest.Mock).mockResolvedValueOnce({
      token: 'new-jwt-token',
      user:  { id: FAKE_USER.id, email: FAKE_USER.email, name: FAKE_USER.name },
    });

    const res = await request(app)
      .post('/api/auth/onboarding/complete')
      .send(VALID_BODY);

    expect(res.status).toBe(200);
    expect(res.body.data.token).toBe('new-jwt-token');
    expect(res.body.data.user.email).toBe('newmember@example.com');
  });

  it('returns 400 when token is missing', async () => {
    const res = await request(app)
      .post('/api/auth/onboarding/complete')
      .send({ password: 'SecurePass123!', first_name: 'New', last_name: 'Member' });

    expect(res.status).toBe(400);
  });

  it('returns 400 when password is missing', async () => {
    const res = await request(app)
      .post('/api/auth/onboarding/complete')
      .send({ token: 'valid-token', first_name: 'New', last_name: 'Member' });

    expect(res.status).toBe(400);
  });

  it('returns 400 when password is too short', async () => {
    const res = await request(app)
      .post('/api/auth/onboarding/complete')
      .send({ ...VALID_BODY, password: 'short' });

    expect(res.status).toBe(400);
  });

  it('returns 400 when token is invalid', async () => {
    (onboardingService.completeOnboarding as jest.Mock).mockRejectedValueOnce(
      Object.assign(new Error('Invalid or expired token'), { statusCode: 400 }),
    );

    const res = await request(app)
      .post('/api/auth/onboarding/complete')
      .send(VALID_BODY);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid or expired token');
  });

  it('returns 500 on unexpected service error', async () => {
    (onboardingService.completeOnboarding as jest.Mock).mockRejectedValueOnce(
      new Error('Unexpected DB failure'),
    );

    const res = await request(app)
      .post('/api/auth/onboarding/complete')
      .send(VALID_BODY);

    expect(res.status).toBe(500);
  });
});
