/**
 * /api/skills — CRUD tests
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
  sendInviteEmail:         jest.fn().mockResolvedValue(undefined),
  sendProfileUpdateEmail:  jest.fn().mockResolvedValue(undefined),
}));

let fakeUser: ReturnType<typeof makeAdminUser> | ReturnType<typeof makeMemberUser> = makeAdminUser();

jest.mock('../../middleware/auth', () => ({
  authenticate: (req: Request, _res: Response, next: NextFunction) => {
    (req as AuthenticatedRequest).user = fakeUser as AuthenticatedRequest['user'];
    next();
  },
}));

import { MockSkill, MockUserSkill, resetAllMocks } from '../helpers/mockModels';
import app from '../../index';

const SKILL = {
  id: 'skill-uuid-1', name: 'Website Design', category: 'Design',
  description: 'Creating visual layouts.', color: '#9B5CFF',
  created_at: '2024-01-01T00:00:00.000Z',
  toJSON: function() { return this; },
};

// ── GET /api/skills ───────────────────────────────────────────────────────────

describe('GET /api/skills', () => {
  beforeEach(() => { resetAllMocks(); fakeUser = makeAdminUser(); });

  it('returns skill list', async () => {
    MockSkill.findAll.mockResolvedValueOnce([SKILL]);
    MockUserSkill.findAll.mockResolvedValueOnce([]);

    const res = await request(app).get('/api/skills');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe('Website Design');
  });

  it('returns empty array when no skills exist', async () => {
    MockSkill.findAll.mockResolvedValueOnce([]);

    const res = await request(app).get('/api/skills');

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('returns 500 when DB query fails', async () => {
    MockSkill.findAll.mockRejectedValueOnce(new Error('DB connection lost'));

    const res = await request(app).get('/api/skills');

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Internal server error');
  });
});

// ── POST /api/skills ──────────────────────────────────────────────────────────

describe('POST /api/skills', () => {
  beforeEach(() => { resetAllMocks(); fakeUser = makeAdminUser(); });

  it('creates a skill and returns 201', async () => {
    MockSkill.create.mockResolvedValueOnce({ ...SKILL, toJSON: () => SKILL });

    const res = await request(app)
      .post('/api/skills')
      .send({ name: 'Website Design', category: 'Design', description: 'Creating visual layouts.', color: '#9B5CFF' });

    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('Website Design');
  });

  it('creates a skill with name only', async () => {
    const minimal = { ...SKILL, category: null, description: null, color: null };
    MockSkill.create.mockResolvedValueOnce({ ...minimal, toJSON: () => minimal });

    const res = await request(app).post('/api/skills').send({ name: 'Website Design' });

    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('Website Design');
  });

  it('returns 400 when name is missing', async () => {
    const res = await request(app).post('/api/skills').send({ category: 'Design' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  it('returns 400 when name is empty string', async () => {
    const res = await request(app).post('/api/skills').send({ name: '   ' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  it('returns 400 when description exceeds 500 characters', async () => {
    const res = await request(app)
      .post('/api/skills')
      .send({ name: 'Design', description: 'x'.repeat(501) });

    expect(res.status).toBe(400);
  });

  it('returns 409 when skill name already exists', async () => {
    const err = Object.assign(new Error('duplicate key'), {
      name: 'SequelizeUniqueConstraintError',
      parent: { code: '23505' },
    });
    MockSkill.create.mockRejectedValueOnce(err);

    const res = await request(app).post('/api/skills').send({ name: 'Website Design' });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already exists/i);
  });

  it('returns 403 when called by a member', async () => {
    fakeUser = makeMemberUser();

    const res = await request(app).post('/api/skills').send({ name: 'Website Design' });

    expect(res.status).toBe(403);
  });
});

// ── DELETE /api/skills/:id ────────────────────────────────────────────────────

describe('DELETE /api/skills/:id', () => {
  beforeEach(() => { resetAllMocks(); fakeUser = makeAdminUser(); });

  it('deletes a skill and returns 200', async () => {
    MockSkill.destroy.mockResolvedValueOnce(1);

    const res = await request(app).delete(`/api/skills/${SKILL.id}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/deleted/i);
  });

  it('returns 500 when DB delete fails', async () => {
    MockSkill.destroy.mockRejectedValueOnce(new Error('delete failed'));

    const res = await request(app).delete(`/api/skills/${SKILL.id}`);

    expect(res.status).toBe(500);
  });

  it('returns 403 when called by a member', async () => {
    fakeUser = makeMemberUser();

    const res = await request(app).delete(`/api/skills/${SKILL.id}`);

    expect(res.status).toBe(403);
  });
});
