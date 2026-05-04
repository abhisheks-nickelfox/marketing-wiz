/**
 * /api/users — CRUD integration tests
 * Sequelize models are mocked — no real DB connections.
 */

import request from 'supertest';
import { makeAdminUser, makeMemberUser } from '../helpers/mockAuth';
import { NextFunction, Request, Response } from 'express';
import { AuthenticatedRequest } from '../../types';

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
  sendInviteEmail:           jest.fn().mockResolvedValue(undefined),
  sendProfileUpdateEmail:    jest.fn().mockResolvedValue(undefined),
  sendWelcomeEmail:          jest.fn().mockResolvedValue(undefined),
  sendAccountDisabledEmail:  jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../modules/notifications/notifications.service', () => ({
  notifyAdmins: jest.fn().mockResolvedValue(undefined),
  notifyUser:   jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../config/storage', () => ({
  uploadBase64Image: jest.fn().mockResolvedValue('https://example.com/avatar.jpg'),
}));

let fakeUser: ReturnType<typeof makeAdminUser> | ReturnType<typeof makeMemberUser> = makeAdminUser();

jest.mock('../../middleware/auth', () => ({
  authenticate: (req: Request, _res: Response, next: NextFunction) => {
    (req as AuthenticatedRequest).user = fakeUser as AuthenticatedRequest['user'];
    next();
  },
}));

import { MockUser, MockUserSkill, resetAllMocks } from '../helpers/mockModels';
import app from '../../index';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const FAKE_USER = {
  id:           'user-uuid-abc',
  email:        'alice@example.com',
  name:         'Alice Admin',
  first_name:   'Alice',
  last_name:    'Admin',
  phone_number: null,
  avatar_url:   null,
  role:         'admin',
  member_role:  null,
  status:       'Active',
  permissions:  [],
  invite_nonce: null,
  created_at:   '2024-01-01T00:00:00.000Z',
  updated_at:   null,
  toJSON: function() { return this; },
};

// ── RBAC unit test ─────────────────────────────────────────────────────────────

describe('RBAC — requireAdmin', () => {
  it('returns 403 when user role is member', () => {
    const { requireAdmin } = jest.requireActual('../../middleware/rbac') as typeof import('../../middleware/rbac');

    const memberReq = { user: makeMemberUser() } as AuthenticatedRequest;
    const mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;
    const mockNext = jest.fn() as NextFunction;

    requireAdmin(memberReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockNext).not.toHaveBeenCalled();
  });
});

// ── GET /api/users ────────────────────────────────────────────────────────────

describe('GET /api/users', () => {
  beforeEach(() => { resetAllMocks(); fakeUser = makeAdminUser(); });

  it('returns 200 with an array of users', async () => {
    MockUser.findAll.mockResolvedValueOnce([FAKE_USER]);
    MockUserSkill.findAll.mockResolvedValueOnce([]);

    const res = await request(app).get('/api/users');

    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.data).toHaveLength(1);
  });

  it('returns 200 with empty array when no users exist', async () => {
    MockUser.findAll.mockResolvedValueOnce([]);

    const res = await request(app).get('/api/users');

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('returns 500 when DB query fails', async () => {
    MockUser.findAll.mockRejectedValueOnce(new Error('DB down'));

    const res = await request(app).get('/api/users');

    expect(res.status).toBe(500);
  });
});

// ── POST /api/users ───────────────────────────────────────────────────────────

describe('POST /api/users', () => {
  beforeEach(() => { resetAllMocks(); fakeUser = makeAdminUser(); });

  it('returns 400 when email is missing', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({ name: 'Bob', password: 'ValidPass1!' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  it('returns 400 when email format is invalid', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({ name: 'Bob', email: 'not-an-email', password: 'ValidPass1!' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  it('returns 400 when password is shorter than 8 characters', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({ name: 'Bob', email: 'bob@example.com', password: 'short' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  it('returns 400 when role is invalid', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({ name: 'Bob', email: 'bob@example.com', password: 'ValidPass1!', role: 'superuser' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  it('returns 201 with the created user on a valid payload', async () => {
    MockUser.findOne.mockResolvedValueOnce(null);
    MockUser.create.mockResolvedValueOnce({ ...FAKE_USER, toJSON: () => FAKE_USER });
    MockUserSkill.findAll.mockResolvedValueOnce([]);

    const res = await request(app)
      .post('/api/users')
      .send({ name: 'Alice Admin', email: 'alice@example.com', password: 'ValidPass1!' });

    expect(res.status).toBe(201);
    expect(res.body.data).toBeDefined();
  });

  it('returns 400 when email already exists', async () => {
    MockUser.findOne.mockResolvedValueOnce(FAKE_USER);

    const res = await request(app)
      .post('/api/users')
      .send({ name: 'Dup User', email: 'duplicate@example.com', password: 'ValidPass1!' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/already exists/i);
  });
});

// ── PATCH /api/users/:id ──────────────────────────────────────────────────────

describe('PATCH /api/users/:id', () => {
  beforeEach(() => { resetAllMocks(); fakeUser = makeAdminUser(); });

  it('returns 400 when no updatable fields are provided', async () => {
    const res = await request(app)
      .patch('/api/users/user-uuid-abc')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/no updatable fields/i);
  });

  it('returns 200 with updated user on valid data', async () => {
    const updated = { ...FAKE_USER, name: 'Alice Updated' };

    // controller calls findUserById before update
    MockUser.findByPk.mockResolvedValueOnce(FAKE_USER);
    MockUserSkill.findAll.mockResolvedValueOnce([]);
    // updateUser
    MockUser.update.mockResolvedValueOnce([1]);
    // findUserById after update
    MockUser.findByPk.mockResolvedValueOnce(updated);
    MockUserSkill.findAll.mockResolvedValueOnce([]);

    const res = await request(app)
      .patch('/api/users/user-uuid-abc')
      .send({ name: 'Alice Updated' });

    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
  });
});

// ── DELETE /api/users/:id ─────────────────────────────────────────────────────

describe('DELETE /api/users/:id', () => {
  beforeEach(() => { resetAllMocks(); fakeUser = makeAdminUser(); });

  it('returns 400 when admin tries to delete their own account', async () => {
    // makeAdminUser() has id = 'admin-user-id'
    const res = await request(app).delete('/api/users/admin-user-id');

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/cannot delete your own/i);
  });

  it('returns 200 when admin deletes a different user', async () => {
    MockUser.destroy.mockResolvedValueOnce(1);

    const res = await request(app).delete('/api/users/other-user-uuid');

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/deleted/i);
  });
});
