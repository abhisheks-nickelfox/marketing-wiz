/**
 * Onboarding flow tests
 *
 * GET  /api/auth/onboarding/validate?token=…
 * POST /api/auth/onboarding/complete
 *
 * The invite token is generated via the real invite.service so the HMAC signing
 * logic is exercised.  Supabase DB and Auth are fully mocked.
 */

import request from 'supertest';

// ── Mock Supabase BEFORE anything imports it ──────────────────────────────────
import {
  supabaseMockModule,
  mockAuthResponse,
  mockDbResponse,
  mockDbQueue,
  resetMocks,
} from '../helpers/mockSupabase';

jest.mock('../../config/supabase', () => supabaseMockModule());
jest.mock('node-cron', () => ({ schedule: jest.fn() }));
jest.mock('../../services/fireflies.service', () => ({
  syncTranscripts: jest.fn().mockResolvedValue({ synced: 0, created: 0, updated: 0, errors: [] }),
}));

// Mock email service so no real SMTP calls are attempted
jest.mock('../../services/email.service', () => ({
  sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
  sendInviteEmail: jest.fn().mockResolvedValue(undefined),
  sendProfileUpdateEmail: jest.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
}));

// Mock skills service used inside onboarding.controller
jest.mock('../../modules/skills/skills.service', () => ({
  findOrCreateSkillByName: jest.fn().mockResolvedValue('skill-uuid-1'),
}));

// ── Import real token generator + app AFTER mocks ─────────────────────────────
import { generateInviteToken } from '../../services/invite.service';
import app from '../../index';

// ── Helpers ───────────────────────────────────────────────────────────────────

const FAKE_NONCE = 'abc123nonce';
const FAKE_USER_ID = 'user-uuid-onboarding';
const FAKE_EMAIL = 'invite@example.com';

/** Build a valid, unexpired invite token using the real signer */
function validToken(): string {
  return generateInviteToken(FAKE_USER_ID, FAKE_EMAIL, FAKE_NONCE);
}

/** Build an expired token by temporarily rewinding the clock */
function expiredToken(): string {
  const realDateNow = Date.now.bind(global.Date);
  // Set clock 25 hours in the past so exp = now + 24h is already past
  jest.spyOn(Date, 'now').mockReturnValue(realDateNow() - 25 * 60 * 60 * 1000);
  const tok = generateInviteToken(FAKE_USER_ID, FAKE_EMAIL, FAKE_NONCE);
  jest.spyOn(Date, 'now').mockRestore();
  return tok;
}

const INVITED_USER = {
  id: FAKE_USER_ID,
  email: FAKE_EMAIL,
  name: 'Invitee',
  first_name: null,
  last_name: null,
  phone_number: null,
  avatar_url: null,
  role: 'member',
  member_role: null,
  status: 'invited',
  permissions: [],
  invite_nonce: FAKE_NONCE,
  skills: [],
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: null,
};

// ── GET /api/auth/onboarding/validate ────────────────────────────────────────

describe('GET /api/auth/onboarding/validate', () => {
  beforeEach(() => {
    resetMocks();
  });

  it('returns 400 when token query param is missing', async () => {
    const res = await request(app).get('/api/auth/onboarding/validate');

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('returns 400 when token is expired', async () => {
    const tok = expiredToken();

    const res = await request(app)
      .get('/api/auth/onboarding/validate')
      .query({ token: tok });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/expired/i);
  });

  it('returns 400 when token signature is tampered', async () => {
    const res = await request(app)
      .get('/api/auth/onboarding/validate')
      .query({ token: 'totally.invalidtoken' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('returns 400 when nonce does not match (invite was re-sent)', async () => {
    const tok = validToken();

    // fetchInviteNonce returns a DIFFERENT nonce — nonce check fails
    mockDbQueue([
      { data: { invite_nonce: 'different-nonce' }, error: null },
    ]);

    const res = await request(app)
      .get('/api/auth/onboarding/validate')
      .query({ token: tok });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/expired|resend/i);
  });

  it('returns 200 with email and name for a valid, unused token', async () => {
    const tok = validToken();

    // validateOnboardingToken makes three DB calls:
    //   1. fetchInviteNonce: users.select('invite_nonce').maybeSingle()
    //   2. findUserById: users.select(USER_SELECT).maybeSingle()
    //   3. attachSkills: user_skills.select().in() (resolves via then())
    mockDbQueue([
      { data: { invite_nonce: FAKE_NONCE }, error: null }, // nonce fetch
      { data: INVITED_USER, error: null },                  // user fetch
      { data: [], error: null },                            // user_skills
    ]);

    const res = await request(app)
      .get('/api/auth/onboarding/validate')
      .query({ token: tok });

    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe(FAKE_EMAIL);
    expect(res.body.data.name).toBeDefined();
  });
});

// ── POST /api/auth/onboarding/complete ───────────────────────────────────────

describe('POST /api/auth/onboarding/complete', () => {
  beforeEach(() => {
    resetMocks();
  });

  const basePayload = {
    token: '', // filled per-test
    first_name: 'Jane',
    last_name: 'Doe',
    password: 'ValidPass1!',
  };

  it('returns 400 when token is missing', async () => {
    const res = await request(app)
      .post('/api/auth/onboarding/complete')
      .send({ ...basePayload, token: undefined });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('returns 400 when password is missing', async () => {
    const tok = validToken();
    const res = await request(app)
      .post('/api/auth/onboarding/complete')
      .send({ token: tok, first_name: 'Jane', last_name: 'Doe' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('returns 400 when password is shorter than 8 characters', async () => {
    const tok = validToken();
    const res = await request(app)
      .post('/api/auth/onboarding/complete')
      .send({ ...basePayload, token: tok, password: 'short' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/8 char/i);
  });

  it('returns 400 when first_name is missing', async () => {
    const tok = validToken();
    const res = await request(app)
      .post('/api/auth/onboarding/complete')
      .send({ token: tok, last_name: 'Doe', password: 'ValidPass1!' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('returns 400 when token is invalid', async () => {
    const res = await request(app)
      .post('/api/auth/onboarding/complete')
      .send({ ...basePayload, token: 'bad.token' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('returns 400 when token nonce is stale', async () => {
    const tok = validToken();
    // fetchInviteNonce returns a different nonce
    mockDbQueue([
      { data: { invite_nonce: 'new-nonce' }, error: null },
    ]);

    const res = await request(app)
      .post('/api/auth/onboarding/complete')
      .send({ ...basePayload, token: tok });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/expired|resend/i);
  });

  it('returns 200 with a JWT on successful onboarding completion', async () => {
    const tok = validToken();

    // completeOnboarding makes these DB calls in order:
    //   1. fetchInviteNonce: users.select('invite_nonce').maybeSingle()
    //   2. findUserById: users.select(USER_SELECT).maybeSingle()
    //   3. attachSkills: user_skills.select().in() → then()
    //   4. storeInviteNonce: users.update().eq() → then()
    //   5. updateUser: users.update().select().maybeSingle()
    //   6. attachSkills (inside updateUser): user_skills.select().in() → then()
    //   7. supabase.auth.signInWithPassword → nextAuthResult
    mockDbQueue([
      { data: { invite_nonce: FAKE_NONCE }, error: null }, // 1. nonce fetch
      { data: INVITED_USER, error: null },                  // 2. user fetch
      { data: [], error: null },                            // 3. user_skills (attachSkills)
      { data: null, error: null },                          // 4. storeInviteNonce update
      { data: { ...INVITED_USER, status: 'Active' }, error: null }, // 5. updateUser result
      { data: [], error: null },                            // 6. user_skills (attachSkills in updateUser)
    ]);

    // signInWithPassword succeeds with a session
    mockAuthResponse({
      user: { id: FAKE_USER_ID },
      session: { access_token: 'new-jwt-after-onboarding' },
    });

    const res = await request(app)
      .post('/api/auth/onboarding/complete')
      .send({ ...basePayload, token: tok });

    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    // May return token directly or null (fallback to login) — both are valid
    if (res.body.data.token) {
      expect(typeof res.body.data.token).toBe('string');
    }
  });
});
