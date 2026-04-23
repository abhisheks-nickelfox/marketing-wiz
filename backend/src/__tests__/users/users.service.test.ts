/**
 * Unit tests for users.service.ts
 *
 * All Supabase I/O is mocked via jest.mock so these tests run without any
 * network connections.  The strategy:
 *
 *   - supabase.from() returns a FRESH independent chain each time it is
 *     called (via mockImplementation). This avoids state-bleed when the
 *     service calls from() multiple times in one function (e.g. profile
 *     insert then user_skills insert in createUser).
 *   - Each test pops the pre-queued chain from `chainQueue` via
 *     `queueChain(chain)` before calling the service method.  The first
 *     call to from() gets chains[0], the second gets chains[1], etc.
 *   - Terminal methods (order, single, maybeSingle, eq when it is the
 *     terminal call, in, insert) are resolved per-chain via
 *     `mockResolvedValueOnce` inside each test.
 */

// ─── Set env vars before any module under test imports them ──────────────────
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key-test';
process.env.SUPABASE_ANON_KEY = 'anon-key-test';

// ─── Chain factory ────────────────────────────────────────────────────────────

type MockChain = {
  select:      jest.Mock;
  insert:      jest.Mock;
  update:      jest.Mock;
  delete:      jest.Mock;
  eq:          jest.Mock;
  in:          jest.Mock;
  order:       jest.Mock;
  maybeSingle: jest.Mock;
  single:      jest.Mock;
};

/** Returns a new chainable Supabase mock where every method returns `this`. */
const buildChain = (): MockChain => {
  const chain = {} as MockChain;
  const methods: Array<keyof MockChain> = [
    'select', 'insert', 'update', 'delete', 'eq', 'in', 'order', 'maybeSingle', 'single',
  ];
  methods.forEach((m) => {
    chain[m] = jest.fn().mockReturnValue(chain);
  });
  return chain;
};

// ─── Queue that from() pops from, one chain per call ─────────────────────────

let chainQueue: MockChain[] = [];

/** Push chains to be returned by successive from() calls within one test. */
function queueChain(...chains: MockChain[]) {
  chainQueue.push(...chains);
}

// Mock the auth.admin helpers.
const mockCreateAuthUser = jest.fn();
const mockDeleteAuthUser = jest.fn();
const mockUpdateAuthUser = jest.fn();

// ─── Mock supabase module ─────────────────────────────────────────────────────
jest.mock('../../config/supabase', () => ({
  __esModule: true,
  default: {
    from: jest.fn(),   // implementation set in beforeEach
    auth: {
      admin: {
        createUser:     mockCreateAuthUser,
        deleteUser:     mockDeleteAuthUser,
        updateUserById: mockUpdateAuthUser,
      },
    },
  },
  anonClient: {},
}));

// Silence winston output.
jest.mock('../../config/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────
import supabase from '../../config/supabase';
import * as usersService from '../../modules/users/users.service';

// ─── Global beforeEach: wire from() to pop from chainQueue ───────────────────

beforeEach(() => {
  chainQueue = [];
  mockCreateAuthUser.mockReset();
  mockDeleteAuthUser.mockReset();
  mockUpdateAuthUser.mockReset();

  (supabase.from as jest.Mock).mockImplementation(() => {
    if (chainQueue.length === 0) {
      // Fallback — return a neutral chain so tests that don't pre-queue still
      // get a valid object (avoids "undefined is not a function" crashes).
      return buildChain();
    }
    return chainQueue.shift()!;
  });
});

// ─── Shared fixtures ──────────────────────────────────────────────────────────

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
  created_at:   '2024-01-01T00:00:00Z',
  updated_at:   null,
};

const MOCK_SKILL = {
  id:         'skill-uuid-1',
  name:       'SEO',
  category:   'Marketing',
  created_at: '2024-01-01T00:00:00Z',
};

// ─── findAllUsers ──────────────────────────────────────────────────────────────

describe('findAllUsers', () => {
  it('returns an empty array when the users table is empty', async () => {
    // from('users') → order() resolves []
    const usersChain = buildChain();
    usersChain.order.mockResolvedValueOnce({ data: [], error: null });
    queueChain(usersChain);

    const result = await usersService.findAllUsers();

    expect(result).toEqual([]);
  });

  it('returns users with their skills attached', async () => {
    // Call 1: from('users') → .select().order()
    const usersChain = buildChain();
    usersChain.order.mockResolvedValueOnce({ data: [MOCK_USER_ROW], error: null });

    // Call 2: from('user_skills') → .select().in()
    const skillsChain = buildChain();
    skillsChain.in.mockResolvedValueOnce({
      data: [{ user_id: 'user-uuid-1', skills: MOCK_SKILL }],
      error: null,
    });

    queueChain(usersChain, skillsChain);

    const result = await usersService.findAllUsers();

    expect(result).toHaveLength(1);
    expect(result[0].skills).toHaveLength(1);
    expect(result[0].skills[0].name).toBe('SEO');
  });

  it('throws when the Supabase query returns an error', async () => {
    const usersChain = buildChain();
    usersChain.order.mockResolvedValueOnce({ data: null, error: { message: 'DB error' } });
    queueChain(usersChain);

    await expect(usersService.findAllUsers()).rejects.toThrow('DB error');
  });
});

// ─── findUserById ─────────────────────────────────────────────────────────────

describe('findUserById', () => {
  it('returns the user when found', async () => {
    // from('users') → .select().eq().maybeSingle()
    const usersChain = buildChain();
    usersChain.maybeSingle.mockResolvedValueOnce({ data: MOCK_USER_ROW, error: null });

    // from('user_skills') → .select().in()
    const skillsChain = buildChain();
    skillsChain.in.mockResolvedValueOnce({ data: [], error: null });

    queueChain(usersChain, skillsChain);

    const user = await usersService.findUserById('user-uuid-1');

    expect(user).not.toBeNull();
    expect(user!.id).toBe('user-uuid-1');
    expect(user!.email).toBe('alice@example.com');
  });

  it('returns null when the user does not exist', async () => {
    const usersChain = buildChain();
    usersChain.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    queueChain(usersChain);

    const user = await usersService.findUserById('nonexistent-id');

    expect(user).toBeNull();
  });

  it('throws when Supabase returns an error', async () => {
    const usersChain = buildChain();
    usersChain.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: { message: 'Connection timeout' },
    });
    queueChain(usersChain);

    await expect(usersService.findUserById('user-uuid-1')).rejects.toThrow('Connection timeout');
  });
});

// ─── createUser ───────────────────────────────────────────────────────────────

describe('createUser', () => {
  const CREATE_DTO = {
    name:     'Bob Member',
    email:    'bob@example.com',
    password: 'secret123',
    role:     'member' as const,
  };

  it('creates auth user + profile and returns a user with empty skills', async () => {
    mockCreateAuthUser.mockResolvedValueOnce({
      data: { user: { id: 'new-user-uuid' } },
      error: null,
    });

    // from('users').insert().select().single()
    const insertChain = buildChain();
    insertChain.single.mockResolvedValueOnce({
      data: { ...MOCK_USER_ROW, id: 'new-user-uuid', email: 'bob@example.com', name: 'Bob Member' },
      error: null,
    });

    // from('user_skills').select().in()  — attachSkills called with 1 user, no skills
    const skillsChain = buildChain();
    skillsChain.in.mockResolvedValueOnce({ data: [], error: null });

    queueChain(insertChain, skillsChain);

    const user = await usersService.createUser(CREATE_DTO);

    expect(mockCreateAuthUser).toHaveBeenCalledWith({
      email:         'bob@example.com',
      password:      'secret123',
      email_confirm: true,
    });
    expect(user.email).toBe('bob@example.com');
    expect(user.skills).toEqual([]);
  });

  it('assigns skills when skill_ids are provided', async () => {
    mockCreateAuthUser.mockResolvedValueOnce({
      data: { user: { id: 'new-user-uuid' } },
      error: null,
    });

    // from('users').insert().select().single()
    const insertChain = buildChain();
    insertChain.single.mockResolvedValueOnce({
      data: { ...MOCK_USER_ROW, id: 'new-user-uuid' },
      error: null,
    });

    // replaceSkills: from('user_skills').delete().eq()
    const deleteChain = buildChain();
    deleteChain.eq.mockResolvedValueOnce({ error: null });

    // replaceSkills: from('user_skills').insert()
    const insertSkillsChain = buildChain();
    insertSkillsChain.insert.mockResolvedValueOnce({ error: null });

    // attachSkills: from('user_skills').select().in()
    const attachChain = buildChain();
    attachChain.in.mockResolvedValueOnce({
      data: [{ user_id: 'new-user-uuid', skills: MOCK_SKILL }],
      error: null,
    });

    queueChain(insertChain, deleteChain, insertSkillsChain, attachChain);

    const user = await usersService.createUser({ ...CREATE_DTO, skill_ids: ['skill-uuid-1'] });

    expect(user.skills).toHaveLength(1);
    expect(user.skills[0].name).toBe('SEO');
  });

  it('throws a 400 error when Supabase Auth rejects the new user', async () => {
    mockCreateAuthUser.mockResolvedValueOnce({
      data:  { user: null },
      error: { message: 'Email already registered' },
    });

    await expect(usersService.createUser(CREATE_DTO)).rejects.toMatchObject({
      message:    'Email already registered',
      statusCode: 400,
    });
  });

  it('rolls back the auth user when profile insert fails', async () => {
    mockCreateAuthUser.mockResolvedValueOnce({
      data: { user: { id: 'new-user-uuid' } },
      error: null,
    });

    const insertChain = buildChain();
    insertChain.single.mockResolvedValueOnce({
      data:  null,
      error: { message: 'FK violation' },
    });
    mockDeleteAuthUser.mockResolvedValueOnce({ error: null });

    queueChain(insertChain);

    await expect(usersService.createUser(CREATE_DTO)).rejects.toThrow('FK violation');
    expect(mockDeleteAuthUser).toHaveBeenCalledWith('new-user-uuid');
  });
});

// ─── updateUser ───────────────────────────────────────────────────────────────

describe('updateUser', () => {
  it('updates profile fields and returns the updated user', async () => {
    const updatedRow = { ...MOCK_USER_ROW, name: 'Alice Updated' };

    // from('users').update().eq().select().maybeSingle()
    const updateChain = buildChain();
    updateChain.maybeSingle.mockResolvedValueOnce({ data: updatedRow, error: null });

    // attachSkills: from('user_skills').select().in()
    const skillsChain = buildChain();
    skillsChain.in.mockResolvedValueOnce({ data: [], error: null });

    queueChain(updateChain, skillsChain);

    const user = await usersService.updateUser('user-uuid-1', { name: 'Alice Updated' });

    expect(user).not.toBeNull();
    expect(user!.name).toBe('Alice Updated');
  });

  it('replaces skills when skill_ids are provided', async () => {
    // from('users').update().eq().select().maybeSingle()
    const updateChain = buildChain();
    updateChain.maybeSingle.mockResolvedValueOnce({ data: MOCK_USER_ROW, error: null });

    // replaceSkills: from('user_skills').delete().eq()
    const deleteChain = buildChain();
    deleteChain.eq.mockResolvedValueOnce({ error: null });

    // replaceSkills: from('user_skills').insert()
    const insertSkillsChain = buildChain();
    insertSkillsChain.insert.mockResolvedValueOnce({ error: null });

    // attachSkills: from('user_skills').select().in()
    const attachChain = buildChain();
    attachChain.in.mockResolvedValueOnce({
      data: [{ user_id: 'user-uuid-1', skills: MOCK_SKILL }],
      error: null,
    });

    queueChain(updateChain, deleteChain, insertSkillsChain, attachChain);

    const user = await usersService.updateUser('user-uuid-1', {
      name:      'Alice Updated',
      skill_ids: ['skill-uuid-1'],
    });

    expect(user!.skills).toHaveLength(1);
    expect(user!.skills[0].name).toBe('SEO');
  });

  it('returns null when the target user does not exist', async () => {
    const updateChain = buildChain();
    updateChain.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    queueChain(updateChain);

    const result = await usersService.updateUser('nonexistent-id', { name: 'Ghost' });

    expect(result).toBeNull();
  });

  it('throws a 400 error when Auth password update fails', async () => {
    mockUpdateAuthUser.mockResolvedValueOnce({
      error: { message: 'Weak password' },
    });

    await expect(
      usersService.updateUser('user-uuid-1', { password: 'short' })
    ).rejects.toMatchObject({
      message:    'Weak password',
      statusCode: 400,
    });
  });

  it('falls back to SELECT when only password is provided (no profile fields)', async () => {
    mockUpdateAuthUser.mockResolvedValueOnce({ error: null });

    // No profile-field patch → SELECT branch: from('users').select().eq().maybeSingle()
    const selectChain = buildChain();
    selectChain.maybeSingle.mockResolvedValueOnce({ data: MOCK_USER_ROW, error: null });

    // attachSkills
    const skillsChain = buildChain();
    skillsChain.in.mockResolvedValueOnce({ data: [], error: null });

    queueChain(selectChain, skillsChain);

    const user = await usersService.updateUser('user-uuid-1', { password: 'newPassword1' });

    expect(user).not.toBeNull();
    expect(user!.name).toBe('Alice Admin');
  });
});

// ─── deleteUser ───────────────────────────────────────────────────────────────

describe('deleteUser', () => {
  it('throws a 400 error when the user tries to delete themselves', async () => {
    await expect(usersService.deleteUser('same-id', 'same-id')).rejects.toMatchObject({
      message:    'Cannot delete your own account',
      statusCode: 400,
    });
  });

  it('deletes profile then Auth account on success', async () => {
    // from('users').delete().eq()
    const deleteChain = buildChain();
    deleteChain.eq.mockResolvedValueOnce({ error: null });
    queueChain(deleteChain);

    mockDeleteAuthUser.mockResolvedValueOnce({ error: null });

    await expect(
      usersService.deleteUser('target-id', 'requester-id')
    ).resolves.toBeUndefined();

    expect(mockDeleteAuthUser).toHaveBeenCalledWith('target-id');
  });

  it('throws when profile delete fails', async () => {
    const deleteChain = buildChain();
    deleteChain.eq.mockResolvedValueOnce({ error: { message: 'FK constraint' } });
    queueChain(deleteChain);

    await expect(usersService.deleteUser('target-id', 'requester-id')).rejects.toThrow(
      'FK constraint'
    );
    expect(mockDeleteAuthUser).not.toHaveBeenCalled();
  });

  it('throws when Auth delete fails', async () => {
    const deleteChain = buildChain();
    deleteChain.eq.mockResolvedValueOnce({ error: null });
    queueChain(deleteChain);

    mockDeleteAuthUser.mockResolvedValueOnce({ error: { message: 'Auth deletion failed' } });

    await expect(usersService.deleteUser('target-id', 'requester-id')).rejects.toThrow(
      'Auth deletion failed'
    );
  });
});

// ─── storeInviteNonce ─────────────────────────────────────────────────────────

describe('storeInviteNonce', () => {
  it('writes the nonce without throwing', async () => {
    // from('users').update().eq()
    const chain = buildChain();
    chain.eq.mockResolvedValueOnce({ error: null });
    queueChain(chain);

    await expect(
      usersService.storeInviteNonce('user-uuid-1', 'abc123nonce')
    ).resolves.toBeUndefined();
  });

  it('throws when Supabase returns an error', async () => {
    const chain = buildChain();
    chain.eq.mockResolvedValueOnce({ error: { message: 'Update failed' } });
    queueChain(chain);

    await expect(usersService.storeInviteNonce('user-uuid-1', 'nonce')).rejects.toThrow(
      'Update failed'
    );
  });
});

// ─── fetchInviteNonce ─────────────────────────────────────────────────────────

describe('fetchInviteNonce', () => {
  it('returns the stored nonce', async () => {
    const chain = buildChain();
    chain.maybeSingle.mockResolvedValueOnce({
      data:  { invite_nonce: 'stored-nonce-value' },
      error: null,
    });
    queueChain(chain);

    const nonce = await usersService.fetchInviteNonce('user-uuid-1');

    expect(nonce).toBe('stored-nonce-value');
  });

  it('returns null when no nonce is stored', async () => {
    const chain = buildChain();
    chain.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    queueChain(chain);

    const nonce = await usersService.fetchInviteNonce('user-uuid-1');

    expect(nonce).toBeNull();
  });

  it('throws when Supabase returns an error', async () => {
    const chain = buildChain();
    chain.maybeSingle.mockResolvedValueOnce({
      data:  null,
      error: { message: 'Nonce lookup failed' },
    });
    queueChain(chain);

    await expect(usersService.fetchInviteNonce('user-uuid-1')).rejects.toThrow(
      'Nonce lookup failed'
    );
  });
});
