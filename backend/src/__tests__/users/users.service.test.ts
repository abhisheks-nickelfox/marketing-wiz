/**
 * Unit tests for users.service.ts
 *
 * Sequelize models are mocked so these tests run without any DB connections.
 */

process.env.JWT_SECRET = 'test-jwt-secret-for-unit-tests';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('../../models', () => require('../helpers/mockModels').mockModelsModule());
jest.mock('../../models/index', () => require('../helpers/mockModels').mockModelsModule());
jest.mock('../../config/database', () => ({
  __esModule: true,
  default: { authenticate: jest.fn(), sync: jest.fn() },
  connectDB: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../config/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));
jest.mock('../../modules/notifications/notifications.service', () => ({
  notifyUser: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../services/email.service', () => ({
  sendInviteEmail:         jest.fn().mockResolvedValue(undefined),
  sendProfileUpdateEmail:  jest.fn().mockResolvedValue(undefined),
}));

// ── Imports (after mocks) ─────────────────────────────────────────────────────

import { MockUser, MockUserSkill, MockSkill, resetAllMocks } from '../helpers/mockModels';
import * as usersService from '../../modules/users/users.service';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MOCK_USER_ROW = {
  id:           'user-uuid-1',
  name:         'Alice Admin',
  first_name:   'Alice',
  last_name:    'Admin',
  phone_number: null,
  avatar_url:   null,
  email:        'alice@example.com',
  role:         'admin' as const,
  member_role:  null,
  status:       'Active' as const,
  permissions:  [],
  invite_nonce: null,
  created_at:   '2024-01-01T00:00:00Z',
  updated_at:   null,
  toJSON:       () => MOCK_USER_ROW,
};

const MOCK_SKILL_ROW = {
  user_id:    'user-uuid-1',
  skill_id:   'skill-uuid-1',
  experience: '2 years',
  skill: {
    id:          'skill-uuid-1',
    name:        'SEO',
    category:    'Marketing',
    description: null,
    color:       null,
    created_at:  '2024-01-01T00:00:00Z',
  },
};

beforeEach(() => resetAllMocks());

// ── findAllUsers ──────────────────────────────────────────────────────────────

describe('findAllUsers', () => {
  it('returns empty data array with zero total when no users exist', async () => {
    MockUser.count.mockResolvedValueOnce(0);
    MockUser.findAll.mockResolvedValueOnce([]);

    const result = await usersService.findAllUsers();

    expect(result.data).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(50);
  });

  it('returns users with skills attached in paginated shape', async () => {
    MockUser.count.mockResolvedValueOnce(1);
    MockUser.findAll.mockResolvedValueOnce([MOCK_USER_ROW]);
    MockUserSkill.findAll.mockResolvedValueOnce([MOCK_SKILL_ROW]);

    const result = await usersService.findAllUsers();

    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.data[0].skills).toHaveLength(1);
    expect(result.data[0].skills[0].name).toBe('SEO');
  });

  it('throws when DB query fails', async () => {
    MockUser.count.mockRejectedValueOnce(new Error('DB error'));

    await expect(usersService.findAllUsers()).rejects.toThrow('DB error');
  });
});

// ── findUserById ──────────────────────────────────────────────────────────────

describe('findUserById', () => {
  it('returns the user when found', async () => {
    MockUser.findByPk.mockResolvedValueOnce(MOCK_USER_ROW);
    MockUserSkill.findAll.mockResolvedValueOnce([]);

    const user = await usersService.findUserById('user-uuid-1');

    expect(user).not.toBeNull();
    expect(user!.id).toBe('user-uuid-1');
    expect(user!.email).toBe('alice@example.com');
  });

  it('returns null when user does not exist', async () => {
    MockUser.findByPk.mockResolvedValueOnce(null);

    const user = await usersService.findUserById('nonexistent-id');

    expect(user).toBeNull();
  });

  it('attaches skills when user has skills', async () => {
    MockUser.findByPk.mockResolvedValueOnce(MOCK_USER_ROW);
    MockUserSkill.findAll.mockResolvedValueOnce([MOCK_SKILL_ROW]);

    const user = await usersService.findUserById('user-uuid-1');

    expect(user!.skills).toHaveLength(1);
    expect(user!.skills[0].name).toBe('SEO');
    expect(user!.skills[0].experience).toBe('2 years');
  });
});

// ── createUser ────────────────────────────────────────────────────────────────

describe('createUser', () => {
  const CREATE_DTO = {
    name:     'Bob Member',
    email:    'bob@example.com',
    password: 'secret123',
    role:     'member' as const,
  };

  it('creates a user and returns with empty skills', async () => {
    MockUser.findOne.mockResolvedValueOnce(null); // no duplicate
    MockUser.create.mockResolvedValueOnce({
      ...MOCK_USER_ROW,
      id: 'new-user-uuid',
      email: 'bob@example.com',
      name: 'Bob Member',
      toJSON: () => ({ ...MOCK_USER_ROW, id: 'new-user-uuid', email: 'bob@example.com' }),
    });
    MockUserSkill.findAll.mockResolvedValueOnce([]);

    const user = await usersService.createUser(CREATE_DTO);

    expect(MockUser.create).toHaveBeenCalled();
    expect(user.email).toBe('bob@example.com');
    expect(user.skills).toEqual([]);
  });

  it('throws 400 when email already exists', async () => {
    MockUser.findOne.mockResolvedValueOnce(MOCK_USER_ROW); // duplicate found

    await expect(usersService.createUser(CREATE_DTO)).rejects.toMatchObject({
      message:    'A user with this email already exists',
      statusCode: 400,
    });
    expect(MockUser.create).not.toHaveBeenCalled();
  });

  it('assigns skills when skill_ids are provided', async () => {
    MockUser.findOne.mockResolvedValueOnce(null);
    MockUser.create.mockResolvedValueOnce({
      ...MOCK_USER_ROW,
      toJSON: () => MOCK_USER_ROW,
    });
    MockUserSkill.destroy.mockResolvedValueOnce(1);
    MockUserSkill.bulkCreate.mockResolvedValueOnce([]);
    MockUserSkill.findAll.mockResolvedValueOnce([MOCK_SKILL_ROW]);

    const user = await usersService.createUser({ ...CREATE_DTO, skill_ids: ['skill-uuid-1'] });

    expect(MockUserSkill.bulkCreate).toHaveBeenCalled();
    expect(user.skills).toHaveLength(1);
    expect(user.skills[0].name).toBe('SEO');
  });
});

// ── updateUser ────────────────────────────────────────────────────────────────

describe('updateUser', () => {
  it('updates profile fields and returns updated user', async () => {
    MockUser.update.mockResolvedValueOnce([1]);
    MockUser.findByPk.mockResolvedValueOnce({ ...MOCK_USER_ROW, name: 'Alice Updated' });
    MockUserSkill.findAll.mockResolvedValueOnce([]);

    const user = await usersService.updateUser('user-uuid-1', { name: 'Alice Updated' });

    expect(user).not.toBeNull();
    expect(user!.name).toBe('Alice Updated');
  });

  it('returns null when user does not exist', async () => {
    MockUser.update.mockResolvedValueOnce([0]);
    MockUser.findByPk.mockResolvedValueOnce(null);

    const result = await usersService.updateUser('nonexistent-id', { name: 'Ghost' });

    expect(result).toBeNull();
  });

  it('replaces skills when skill_ids are provided', async () => {
    MockUser.update.mockResolvedValueOnce([1]);
    MockUserSkill.destroy.mockResolvedValueOnce(1);
    MockUserSkill.bulkCreate.mockResolvedValueOnce([]);
    MockUser.findByPk.mockResolvedValueOnce(MOCK_USER_ROW);
    MockUserSkill.findAll.mockResolvedValueOnce([MOCK_SKILL_ROW]);

    const user = await usersService.updateUser('user-uuid-1', {
      name:      'Alice Updated',
      skill_ids: ['skill-uuid-1'],
    });

    expect(MockUserSkill.destroy).toHaveBeenCalled();
    expect(MockUserSkill.bulkCreate).toHaveBeenCalled();
    expect(user!.skills).toHaveLength(1);
  });
});

// ── deleteUser ────────────────────────────────────────────────────────────────

describe('deleteUser', () => {
  it('throws 400 when user tries to delete themselves', async () => {
    await expect(usersService.deleteUser('same-id', 'same-id')).rejects.toMatchObject({
      message:    'Cannot delete your own account',
      statusCode: 400,
    });
  });

  it('deletes user successfully', async () => {
    MockUser.destroy.mockResolvedValueOnce(1);

    await expect(usersService.deleteUser('target-id', 'requester-id')).resolves.toBeUndefined();
    expect(MockUser.destroy).toHaveBeenCalledWith({ where: { id: 'target-id' } });
  });

  it('throws 404 when user not found', async () => {
    MockUser.destroy.mockResolvedValueOnce(0);

    await expect(usersService.deleteUser('nonexistent-id', 'requester-id')).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});

// ── storeInviteNonce ──────────────────────────────────────────────────────────

describe('storeInviteNonce', () => {
  it('stores nonce without throwing', async () => {
    MockUser.update.mockResolvedValueOnce([1]);

    await expect(usersService.storeInviteNonce('user-uuid-1', 'abc123')).resolves.toBeUndefined();
    expect(MockUser.update).toHaveBeenCalledWith(
      { invite_nonce: 'abc123' },
      { where: { id: 'user-uuid-1' } },
    );
  });
});

// ── fetchInviteNonce ──────────────────────────────────────────────────────────

describe('fetchInviteNonce', () => {
  it('returns the stored nonce', async () => {
    MockUser.findByPk.mockResolvedValueOnce({ invite_nonce: 'stored-nonce' });

    const nonce = await usersService.fetchInviteNonce('user-uuid-1');

    expect(nonce).toBe('stored-nonce');
  });

  it('returns null when no nonce is stored', async () => {
    MockUser.findByPk.mockResolvedValueOnce(null);

    const nonce = await usersService.fetchInviteNonce('user-uuid-1');

    expect(nonce).toBeNull();
  });

  it('returns null when invite_nonce field is null', async () => {
    MockUser.findByPk.mockResolvedValueOnce({ invite_nonce: null });

    const nonce = await usersService.fetchInviteNonce('user-uuid-1');

    expect(nonce).toBeNull();
  });
});
