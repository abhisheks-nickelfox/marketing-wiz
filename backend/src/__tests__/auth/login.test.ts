/**
 * POST /api/auth/login
 *
 * Tests the login endpoint in isolation.  Supabase is fully mocked so no
 * network calls are made.  The cron job and server listen() are NOT started —
 * we import `app` directly from src/index.ts, which exports the Express app
 * before calling app.listen().
 */

import request from 'supertest';

// ── Mock Supabase before any module that imports it is loaded ─────────────────
import {
  supabaseMockModule,
  mockAuthResponse,
  mockDbResponse,
  mockDbQueue,
  resetMocks,
} from '../helpers/mockSupabase';

jest.mock('../../config/supabase', () => supabaseMockModule());

// Mock node-cron so the cron.schedule() call in index.ts is a no-op
jest.mock('node-cron', () => ({ schedule: jest.fn() }));

// Mock the fireflies sync so startup doesn't try to reach the network
jest.mock('../../services/fireflies.service', () => ({
  syncTranscripts: jest.fn().mockResolvedValue({ synced: 0, created: 0, updated: 0, errors: [] }),
}));

// ── Import app AFTER mocks are in place ───────────────────────────────────────
import app from '../../index';

// ── Shared fake data ──────────────────────────────────────────────────────────

const FAKE_PROFILE = {
  id: 'user-uuid-1234',
  email: 'alice@example.com',
  name: 'Alice',
  role: 'admin',
  permissions: [],
  status: 'Active',
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: null,
};

const FAKE_SESSION = {
  access_token: 'fake-jwt-token',
  token_type: 'bearer',
  expires_in: 3600,
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    resetMocks();
  });

  // ── Happy path ──────────────────────────────────────────────────────────────

  it('returns 200 with user and token on valid credentials', async () => {
    // anonClient.auth.signInWithPassword success
    mockAuthResponse({ user: { id: FAKE_PROFILE.id }, session: FAKE_SESSION });
    // loginUser calls: supabase.from('users').select().eq().single()
    // That is one DB call (single()), returning FAKE_PROFILE
    mockDbResponse(FAKE_PROFILE);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alice@example.com', password: 'correctpassword' });

    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.token).toBe('fake-jwt-token');
    expect(res.body.data.user).toBeDefined();
  });

  it('returned user object has expected shape and no password field', async () => {
    mockAuthResponse({ user: { id: FAKE_PROFILE.id }, session: FAKE_SESSION });
    mockDbResponse(FAKE_PROFILE);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alice@example.com', password: 'correctpassword' });

    const user = res.body.data?.user as Record<string, unknown>;
    expect(user.id).toBeDefined();
    expect(user.email).toBeDefined();
    expect(user.name).toBeDefined();
    expect(user.role).toBeDefined();
    // password must never be returned
    expect(user.password).toBeUndefined();
    expect(user.encrypted_password).toBeUndefined();
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

  // ── Wrong credentials ───────────────────────────────────────────────────────

  it('returns 401 when Supabase rejects the credentials', async () => {
    // signInWithPassword returns an error (invalid credentials)
    mockAuthResponse(
      { user: null, session: null },
      { message: 'Invalid login credentials' }
    );

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alice@example.com', password: 'wrongpassword' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBeDefined();
  });

  it('returns 401 when auth succeeds but no session is returned', async () => {
    // Edge case: authError is null but session is also null (shouldn't happen in prod
    // but the service guards against it)
    mockAuthResponse({ user: { id: 'uid' }, session: null });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alice@example.com', password: 'somepassword' });

    expect(res.status).toBe(401);
  });
});
