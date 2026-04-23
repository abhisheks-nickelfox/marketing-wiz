/**
 * /api/users — CRUD tests
 *
 * All Supabase calls are mocked.  Auth middleware is replaced with a stub that
 * injects a fake req.user, enabling us to test the role-gating without needing
 * real JWTs.
 */

import request from 'supertest';

// ── Supabase mock — must come before any module import ────────────────────────
import {
  supabaseMockModule,
  mockAuthResponse,
  mockDbResponse,
  mockDbQueue,
  mockAuthAdminResponse,
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

// ── Auth middleware mocks (overridden per-describe block) ─────────────────────
import { makeAdminUser, makeMemberUser } from '../helpers/mockAuth';
import { NextFunction, Request, Response } from 'express';
import { AuthenticatedRequest } from '../../types';

// Default: inject admin user (most tests need admin)
const currentFakeUser = makeAdminUser();

jest.mock('../../middleware/auth', () => ({
  authenticate: (req: Request, _res: Response, next: NextFunction) => {
    (req as AuthenticatedRequest).user = currentFakeUser as AuthenticatedRequest['user'];
    next();
  },
}));

import app from '../../index';

// ── Shared fixtures ───────────────────────────────────────────────────────────

const FAKE_USER = {
  id: 'user-uuid-abc',
  email: 'alice@example.com',
  name: 'Alice Admin',
  first_name: 'Alice',
  last_name: 'Admin',
  phone_number: null,
  avatar_url: null,
  role: 'admin',
  member_role: null,
  status: 'Active',
  permissions: [],
  invite_nonce: null,
  skills: [],
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: null,
};

// ── GET /api/users ────────────────────────────────────────────────────────────

describe('GET /api/users', () => {
  beforeEach(() => {
    resetMocks();
  });

  it('returns 401 when no Authorization header is provided', async () => {
    // Temporarily restore real auth middleware for this test
    // We do it by making a request directly with no auth header.
    // Since our mock always injects a user and calls next(), we can't easily
    // test the 401 path through supertest here without a real middleware.
    // Instead, test the middleware unit directly.
    const { authenticate } = jest.requireActual('../../middleware/auth') as typeof import('../../middleware/auth');

    // Simulate missing header
    const mockReq = { headers: {} } as Request;
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as unknown as Response;
    const mockNext = jest.fn() as NextFunction;

    await authenticate(mockReq as AuthenticatedRequest, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('returns 403 when user role is member (admin-only endpoint)', async () => {
    // Override the mock to inject a member user for this request
    // We re-spy on the authenticate mock within the rbac middleware
    // The cleanest way is to test requireAdmin directly
    const { requireAdmin } = jest.requireActual('../../middleware/rbac') as typeof import('../../middleware/rbac');

    const memberReq = {
      user: makeMemberUser(),
    } as AuthenticatedRequest;
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as unknown as Response;
    const mockNext = jest.fn() as NextFunction;

    requireAdmin(memberReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('returns 200 with an array when called with admin token', async () => {
    // findAllUsers makes two DB calls:
    //   1. supabase.from('users').select(...).order()  → array of user rows
    //   2. supabase.from('user_skills').select(...).in() → array of skill-join rows
    mockDbQueue([
      { data: [FAKE_USER], error: null },  // users list
      { data: [], error: null },            // user_skills (no skills assigned)
    ]);

    const res = await request(app)
      .get('/api/users')
      .set('Authorization', 'Bearer fake-admin-token');

    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
  });
});

// ── POST /api/users ───────────────────────────────────────────────────────────

describe('POST /api/users', () => {
  beforeEach(() => {
    resetMocks();
  });

  it('returns 400 when name is missing', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', 'Bearer fake-admin-token')
      .send({ email: 'newuser@example.com', password: 'ValidPass1!' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  it('returns 400 when email is missing', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', 'Bearer fake-admin-token')
      .send({ name: 'Bob', password: 'ValidPass1!' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  it('returns 400 when email format is invalid', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', 'Bearer fake-admin-token')
      .send({ name: 'Bob', email: 'not-an-email', password: 'ValidPass1!' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  it('returns 400 when password is shorter than 8 characters', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', 'Bearer fake-admin-token')
      .send({ name: 'Bob', email: 'bob@example.com', password: 'short' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  it('returns 400 when role is an invalid value', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', 'Bearer fake-admin-token')
      .send({ name: 'Bob', email: 'bob@example.com', password: 'ValidPass1!', role: 'superuser' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  it('returns 201 with the created user on a valid payload', async () => {
    // Auth admin createUser succeeds
    mockAuthAdminResponse({ user: { id: 'new-user-id' }, error: null });
    // createUser service makes two DB calls:
    //   1. supabase.from('users').insert().select().single()  → profile row
    //   2. supabase.from('user_skills').select(...).in()      → skills (attachSkills)
    mockDbQueue([
      { data: FAKE_USER, error: null }, // profile insert result
      { data: [], error: null },         // user_skills (no skills)
    ]);

    const res = await request(app)
      .post('/api/users')
      .set('Authorization', 'Bearer fake-admin-token')
      .send({ name: 'Alice Admin', email: 'alice@example.com', password: 'ValidPass1!' });

    expect(res.status).toBe(201);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.id).toBeDefined();
  });

  it('returns 400 (from service) when Supabase auth reports duplicate email', async () => {
    // Supabase createUser returns an error for duplicate email
    mockAuthAdminResponse(
      { user: null },
      { message: 'User already registered' }
    );

    const res = await request(app)
      .post('/api/users')
      .set('Authorization', 'Bearer fake-admin-token')
      .send({ name: 'Dup User', email: 'duplicate@example.com', password: 'ValidPass1!' });

    // Service throws with statusCode: 400; controller maps to 400
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/already registered|failed/i);
  });
});

// ── PATCH /api/users/:id ──────────────────────────────────────────────────────

describe('PATCH /api/users/:id', () => {
  beforeEach(() => {
    resetMocks();
  });

  it('returns 400 when no updatable fields are provided', async () => {
    // The controller checks for updatable fields BEFORE calling the service,
    // so no DB calls are made — no mock setup needed.
    const res = await request(app)
      .patch('/api/users/user-uuid-abc')
      .set('Authorization', 'Bearer fake-admin-token')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/no updatable fields/i);
  });

  it('returns 200 with updated user on valid data', async () => {
    // updateUser in controller makes these DB calls:
    //   1. findUserById → users.select().maybeSingle()
    //   2. findUserById → user_skills.select().in()       (attachSkills)
    //   3. updateUser   → users.update().select().maybeSingle()
    //   4. updateUser   → user_skills.select().in()       (attachSkills again)
    const updated = { ...FAKE_USER, name: 'Alice Updated' };
    mockDbQueue([
      { data: FAKE_USER, error: null }, // findUserById: users row
      { data: [], error: null },         // findUserById: user_skills
      { data: updated, error: null },    // updateUser: users update result
      { data: [], error: null },         // updateUser: user_skills
    ]);

    const res = await request(app)
      .patch('/api/users/user-uuid-abc')
      .set('Authorization', 'Bearer fake-admin-token')
      .send({ name: 'Alice Updated' });

    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
  });
});

// ── DELETE /api/users/:id ─────────────────────────────────────────────────────

describe('DELETE /api/users/:id', () => {
  beforeEach(() => {
    resetMocks();
  });

  it('returns 400 when admin tries to delete their own account', async () => {
    // The currentFakeUser.id is 'admin-user-id' — delete that same id
    const res = await request(app)
      .delete('/api/users/admin-user-id')
      .set('Authorization', 'Bearer fake-admin-token');

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/cannot delete your own/i);
  });

  it('returns 200 when admin deletes a different user', async () => {
    // deleteUser service:
    //   1. supabase.from('users').delete().eq()  → resolves via then() with { data, error: null }
    //   2. supabase.auth.admin.deleteUser(id)    → uses nextAuthAdminResult
    mockDbResponse(null); // users.delete() succeeds (no error)
    mockAuthAdminResponse({ user: null }, null); // auth.admin.deleteUser() succeeds

    const res = await request(app)
      .delete('/api/users/other-user-uuid')
      .set('Authorization', 'Bearer fake-admin-token');

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/deleted/i);
  });
});
