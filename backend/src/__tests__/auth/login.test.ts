/**
 * POST /api/auth/login
 *
 * Tests the login endpoint in isolation. Sequelize models and JWT are mocked
 * so no database or network calls are made.
 */

import request from 'supertest';

// ── Mocks must be declared before imports ─────────────────────────────────────

jest.mock('../../models', () => require('../helpers/mockModels').mockModelsModule());
jest.mock('node-cron', () => ({ schedule: jest.fn() }));
jest.mock('../../services/fireflies.service', () => ({
  syncTranscripts: jest.fn().mockResolvedValue({ synced: 0, created: 0, updated: 0, errors: [] }),
}));
jest.mock('../../config/database', () => ({
  __esModule: true,
  default: { authenticate: jest.fn().mockResolvedValue(undefined), sync: jest.fn() },
  connectDB:  jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../models/index', () => require('../helpers/mockModels').mockModelsModule());

// ── Import after mocks ────────────────────────────────────────────────────────

import { MockUser, resetAllMocks } from '../helpers/mockModels';
import app from '../../index';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const ACTIVE_USER = {
  id:          'user-uuid-1234',
  email:       'alice@example.com',
  name:        'Alice',
  role:        'admin',
  permissions: [],
  status:      'Active',
  created_at:  '2024-01-01T00:00:00.000Z',
  updated_at:  null,
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('POST /api/auth/login', () => {
  beforeEach(() => resetAllMocks());

  // ── Happy path ──────────────────────────────────────────────────────────────

  it('returns 200 with user and token on valid credentials', async () => {
    MockUser.findOne.mockResolvedValueOnce(ACTIVE_USER);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alice@example.com', password: 'correctpassword' });

    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user).toBeDefined();
  });

  it('returned user has expected shape and no password field', async () => {
    MockUser.findOne.mockResolvedValueOnce(ACTIVE_USER);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alice@example.com', password: 'correctpassword' });

    const user = res.body.data?.user as Record<string, unknown>;
    expect(user.id).toBeDefined();
    expect(user.email).toBeDefined();
    expect(user.name).toBeDefined();
    expect(user.role).toBeDefined();
    expect(user.password).toBeUndefined();
    expect(user.password_hash).toBeUndefined();
  });

  // ── Validation errors ───────────────────────────────────────────────────────

  it('returns 400 when email is missing', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ password: 'somepassword' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  it('returns 400 when password is missing', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alice@example.com' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  it('returns 400 for invalid email format', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'not-an-email', password: 'somepassword' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  it('returns 400 when body is empty', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  // ── Auth failures ───────────────────────────────────────────────────────────

  it('returns 401 when user is not found', async () => {
    MockUser.findOne.mockResolvedValueOnce(null);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'wrongpassword' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBeDefined();
  });

  it('returns 401 when account is disabled', async () => {
    MockUser.findOne.mockResolvedValueOnce({ ...ACTIVE_USER, status: 'Disabled' });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alice@example.com', password: 'password' });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/disabled/i);
  });

  it('returns 401 when account is invited (onboarding not complete)', async () => {
    MockUser.findOne.mockResolvedValueOnce({ ...ACTIVE_USER, status: 'invited' });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alice@example.com', password: 'password' });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/onboarding/i);
  });
});
