/**
 * mockModels.ts
 *
 * Provides jest mocks for all Sequelize models used in services.
 * Import and call jest.mock('../../models', () => mockModelsModule()) in test files.
 */

export function makeMockModel(overrides: Record<string, jest.Mock> = {}) {
  return {
    findAll:    jest.fn(),
    findOne:    jest.fn(),
    findByPk:   jest.fn(),
    create:     jest.fn(),
    update:     jest.fn(),
    destroy:    jest.fn(),
    bulkCreate: jest.fn(),
    count:      jest.fn(),
    ...overrides,
  };
}

export const MockUser      = makeMockModel();
export const MockSkill     = makeMockModel();
export const MockUserSkill = makeMockModel();
export const MockFirm      = makeMockModel();
export const MockTicket    = makeMockModel();
export const MockProject   = makeMockModel();

export function resetAllMocks() {
  [MockUser, MockSkill, MockUserSkill, MockFirm, MockTicket, MockProject].forEach((m) => {
    Object.values(m).forEach((fn) => (fn as jest.Mock).mockReset());
  });
}

export function mockModelsModule() {
  return {
    __esModule: true,
    User:       MockUser,
    Skill:      MockSkill,
    UserSkill:  MockUserSkill,
    Firm:       MockFirm,
    Ticket:     MockTicket,
    Project:    MockProject,
    Notification:      { findAll: jest.fn(), create: jest.fn(), update: jest.fn() },
    Prompt:            { findAll: jest.fn(), findByPk: jest.fn() },
    Transcript:        { findAll: jest.fn(), findByPk: jest.fn(), create: jest.fn() },
    ProcessingSession: { findAll: jest.fn(), create: jest.fn() },
    TimeLog:           { findAll: jest.fn(), create: jest.fn(), update: jest.fn(), destroy: jest.fn() },
    ProjectMember:     { findAll: jest.fn(), create: jest.fn(), destroy: jest.fn() },
    OrgSettings:       { findOne: jest.fn(), create: jest.fn(), update: jest.fn() },
  };
}
