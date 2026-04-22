/**
 * Integration-style unit tests for users.controller.ts
 *
 * Strategy:
 *  - Mount only the users router on a minimal Express app (no global middleware).
 *  - Mock authenticate and requireAdmin to call next() immediately, so tests
 *    focus purely on controller logic.
 *  - Mock usersService and emailService so no real I/O happens.
 *  - req.user is attached by the mocked authenticate middleware.
 */

// ─── Env vars must be set before any module that reads them ──────────────────
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key-test';
process.env.SUPABASE_ANON_KEY = 'anon-key-test';

// ─── Mock auth middleware ─────────────────────────────────────────────────────
// Both middlewares are replaced with pass-through fns that attach a fake admin
// user to req so controllers can read req.user.
const FAKE_ADMIN_USER = {
  id:          'admin-uuid-1',
  email:       'admin@example.com',
  name:        'Test Admin',
  role:        'admin',
  permissions: [],
  created_at:  '2024-01-01T00:00:00Z',
};

jest.mock('../../../middleware/auth', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.user = FAKE_ADMIN_USER;
    next();
  },
}));

jest.mock('../../../middleware/rbac', () => ({
  requireAdmin:      (_req: any, _res: any, next: any) => next(),
  requireMember:     (_req: any, _res: any, next: any) => next(),
  requireSuperAdmin: (_req: any, _res: any, next: any) => next(),
  requirePermission: () => (_req: any, _res: any, next: any) => next(),
}));

// ─── Mock usersService ───────────────────────────────────────────────────────
jest.mock('../users.service');

// ─── Mock email and invite services (fire-and-forget in the controller) ───────
jest.mock('../../../services/email.service', () => ({
  sendInviteEmail:        jest.fn().mockResolvedValue(undefined),
  sendProfileUpdateEmail: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../services/invite.service', () => ({
  generateInviteToken: jest.fn().mockReturnValue('mock-invite-token'),
  verifyInviteToken:   jest.fn(),
}));

// Silence logger output.
jest.mock('../../../config/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

// ─── Imports (after all mocks are registered) ────────────────────────────────
import express from 'express';
import request from 'supertest';
import usersRouter from '../users.routes';
import * as usersService from '../users.service';

// ─── Shared fixtures ─────────────────────────────────────────────────────────

const MOCK_USER = {
  id:           'user-uuid-1',
  name:         'Alice Member',
  first_name:   'Alice',
  last_name:    'Member',
  phone_number: null,
  avatar_url:   null,
  email:        'alice@example.com',
  role:         'member' as const,
  member_role:  'Designer',
  status:       'Active' as const,
  permissions:  [] as string[],
  skills:       [],
  created_at:   '2024-01-01T00:00:00Z',
  updated_at:   null,
};

// ─── App setup ────────────────────────────────────────────────────────────────

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/users', usersRouter);
  return app;
}

// ─── GET /api/users ───────────────────────────────────────────────────────────

describe('GET /api/users', () => {
  it('returns 200 with a list of users', async () => {
    (usersService.findAllUsers as jest.Mock).mockResolvedValueOnce([MOCK_USER]);

    const res = await request(buildApp()).get('/api/users');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].email).toBe('alice@example.com');
  });

  it('returns 200 with an empty array when no users exist', async () => {
    (usersService.findAllUsers as jest.Mock).mockResolvedValueOnce([]);

    const res = await request(buildApp()).get('/api/users');

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('returns 500 when the service throws an unexpected error', async () => {
    (usersService.findAllUsers as jest.Mock).mockRejectedValueOnce(new Error('DB down'));

    const res = await request(buildApp()).get('/api/users');

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Internal server error');
  });
});

// ─── GET /api/users/:id ───────────────────────────────────────────────────────

describe('GET /api/users/:id', () => {
  it('returns 200 with the user when found', async () => {
    (usersService.findUserById as jest.Mock).mockResolvedValueOnce(MOCK_USER);

    const res = await request(buildApp()).get('/api/users/user-uuid-1');

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe('user-uuid-1');
  });

  it('returns 404 when the user does not exist', async () => {
    (usersService.findUserById as jest.Mock).mockResolvedValueOnce(null);

    const res = await request(buildApp()).get('/api/users/nonexistent-id');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('User not found');
  });

  it('returns 500 when the service throws', async () => {
    (usersService.findUserById as jest.Mock).mockRejectedValueOnce(new Error('Unexpected'));

    const res = await request(buildApp()).get('/api/users/user-uuid-1');

    expect(res.status).toBe(500);
  });
});

// ─── POST /api/users ──────────────────────────────────────────────────────────

describe('POST /api/users', () => {
  const VALID_BODY = {
    name:     'Bob New',
    email:    'bob@example.com',
    password: 'password123',
    role:     'member',
    status:   'Active',
  };

  it('returns 201 with the created user on a valid body', async () => {
    (usersService.createUser as jest.Mock).mockResolvedValueOnce({
      ...MOCK_USER,
      email: 'bob@example.com',
      name: 'Bob New',
      status: 'Active',
    });

    const res = await request(buildApp()).post('/api/users').send(VALID_BODY);

    expect(res.status).toBe(201);
    expect(res.body.data.email).toBe('bob@example.com');
  });

  it('returns 201 and generates an invite token when status is invited', async () => {
    const invitedUser = { ...MOCK_USER, email: 'invited@example.com', status: 'invited' as const };
    (usersService.createUser as jest.Mock).mockResolvedValueOnce(invitedUser);
    (usersService.storeInviteNonce as jest.Mock).mockResolvedValueOnce(undefined);

    const res = await request(buildApp())
      .post('/api/users')
      .send({ ...VALID_BODY, email: 'invited@example.com', status: 'invited' });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('invited');
  });

  it('returns 400 on validation error — missing name', async () => {
    const res = await request(buildApp())
      .post('/api/users')
      .send({ email: 'noemail@example.com', password: 'password123' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
    expect(res.body.details).toBeDefined();
  });

  it('returns 400 on validation error — invalid email', async () => {
    const res = await request(buildApp())
      .post('/api/users')
      .send({ name: 'Test', email: 'not-an-email', password: 'password123' });

    expect(res.status).toBe(400);
  });

  it('returns 400 when the service throws with statusCode 400', async () => {
    const err = Object.assign(new Error('Email already exists'), { statusCode: 400 });
    (usersService.createUser as jest.Mock).mockRejectedValueOnce(err);

    const res = await request(buildApp()).post('/api/users').send(VALID_BODY);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Email already exists');
  });

  it('returns 500 when the service throws an unexpected error', async () => {
    (usersService.createUser as jest.Mock).mockRejectedValueOnce(new Error('DB crash'));

    const res = await request(buildApp()).post('/api/users').send(VALID_BODY);

    expect(res.status).toBe(500);
  });
});

// ─── PATCH /api/users/:id ─────────────────────────────────────────────────────

describe('PATCH /api/users/:id', () => {
  it('returns 200 with the updated user on a valid body', async () => {
    const updatedUser = { ...MOCK_USER, name: 'Alice Renamed' };
    (usersService.findUserById as jest.Mock).mockResolvedValueOnce(MOCK_USER);
    (usersService.updateUser as jest.Mock).mockResolvedValueOnce(updatedUser);

    const res = await request(buildApp())
      .patch('/api/users/user-uuid-1')
      .send({ name: 'Alice Renamed' });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Alice Renamed');
  });

  it('returns 400 when no updatable fields are provided', async () => {
    const res = await request(buildApp())
      .patch('/api/users/user-uuid-1')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('No updatable fields provided');
  });

  it('returns 400 on validation error — password too short', async () => {
    const res = await request(buildApp())
      .patch('/api/users/user-uuid-1')
      .send({ password: 'short' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  it('returns 404 when the target user is not found before update', async () => {
    (usersService.findUserById as jest.Mock).mockResolvedValueOnce(null);

    const res = await request(buildApp())
      .patch('/api/users/nonexistent-id')
      .send({ name: 'Ghost' });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('User not found');
  });

  it('returns 400 when the service throws with statusCode 400', async () => {
    (usersService.findUserById as jest.Mock).mockResolvedValueOnce(MOCK_USER);
    const err = Object.assign(new Error('Weak password'), { statusCode: 400 });
    (usersService.updateUser as jest.Mock).mockRejectedValueOnce(err);

    const res = await request(buildApp())
      .patch('/api/users/user-uuid-1')
      .send({ password: 'weakpass' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Weak password');
  });

  it('returns 500 when the service throws an unexpected error', async () => {
    (usersService.findUserById as jest.Mock).mockResolvedValueOnce(MOCK_USER);
    (usersService.updateUser as jest.Mock).mockRejectedValueOnce(new Error('DB fail'));

    const res = await request(buildApp())
      .patch('/api/users/user-uuid-1')
      .send({ name: 'Alice' });

    expect(res.status).toBe(500);
  });
});

// ─── DELETE /api/users/:id ────────────────────────────────────────────────────

describe('DELETE /api/users/:id', () => {
  it('returns 200 with a success message on a valid delete', async () => {
    (usersService.deleteUser as jest.Mock).mockResolvedValueOnce(undefined);

    const res = await request(buildApp()).delete('/api/users/other-user-id');

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('User deleted successfully');
  });

  it('returns 400 when the user attempts to delete themselves', async () => {
    // The controller passes req.user.id as requesterId.
    // FAKE_ADMIN_USER.id = 'admin-uuid-1', so if we try to delete that same ID:
    const err = Object.assign(new Error('Cannot delete your own account'), { statusCode: 400 });
    (usersService.deleteUser as jest.Mock).mockRejectedValueOnce(err);

    const res = await request(buildApp()).delete('/api/users/admin-uuid-1');

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Cannot delete your own account');
  });

  it('returns 500 when the service throws an unexpected error', async () => {
    (usersService.deleteUser as jest.Mock).mockRejectedValueOnce(new Error('Auth error'));

    const res = await request(buildApp()).delete('/api/users/user-uuid-1');

    expect(res.status).toBe(500);
  });
});

// ─── POST /api/users/:id/resend-invite ───────────────────────────────────────

describe('POST /api/users/:id/resend-invite', () => {
  it('returns 200 on a successful resend for an invited user', async () => {
    const invitedUser = { ...MOCK_USER, status: 'invited' as const };
    (usersService.findUserById as jest.Mock).mockResolvedValueOnce(invitedUser);
    (usersService.storeInviteNonce as jest.Mock).mockResolvedValueOnce(undefined);

    const res = await request(buildApp()).post('/api/users/user-uuid-1/resend-invite');

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Invite resent successfully');
  });

  it('returns 404 when the user does not exist', async () => {
    (usersService.findUserById as jest.Mock).mockResolvedValueOnce(null);

    const res = await request(buildApp()).post('/api/users/nonexistent/resend-invite');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('User not found');
  });

  it('returns 400 when the user is not in invited status', async () => {
    (usersService.findUserById as jest.Mock).mockResolvedValueOnce(MOCK_USER); // status: 'Active'

    const res = await request(buildApp()).post('/api/users/user-uuid-1/resend-invite');

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('User is not in invited status');
  });
});
