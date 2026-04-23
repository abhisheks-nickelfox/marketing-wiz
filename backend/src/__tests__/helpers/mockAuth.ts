/**
 * mockAuth.ts
 *
 * Provides a pre-built `authenticate` middleware replacement that immediately
 * injects a fake `req.user` without hitting Supabase, enabling route-level
 * tests for endpoints that sit behind auth.
 *
 * Usage:
 *
 *   jest.mock('../../middleware/auth', () => require('../helpers/mockAuth').mockAuthModule(fakeUser));
 *
 * Or, to use the factories directly:
 *
 *   import { makeAdminUser, makeMemberUser } from './mockAuth';
 */

import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../types';

// ── Fake user factories ───────────────────────────────────────────────────────

export function makeAdminUser(overrides: Partial<AuthenticatedRequest['user']> = {}) {
  return {
    id: 'admin-user-id',
    email: 'admin@example.com',
    name: 'Test Admin',
    role: 'admin' as const,
    permissions: [],
    created_at: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

export function makeMemberUser(overrides: Partial<AuthenticatedRequest['user']> = {}) {
  return {
    id: 'member-user-id',
    email: 'member@example.com',
    name: 'Test Member',
    role: 'member' as const,
    permissions: [],
    created_at: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

// ── Module factory ────────────────────────────────────────────────────────────

/**
 * Returns a jest.mock-compatible module replacement for ../../middleware/auth.
 * The `authenticate` function it exports will inject `fakeUser` into req.user
 * and call next() immediately — no Supabase call.
 */
export function mockAuthModule(fakeUser: ReturnType<typeof makeAdminUser> | ReturnType<typeof makeMemberUser>) {
  return {
    authenticate: (req: Request, _res: Response, next: NextFunction) => {
      (req as AuthenticatedRequest).user = fakeUser as AuthenticatedRequest['user'];
      next();
    },
  };
}
