/**
 * mockSupabase.ts
 *
 * Provides a factory for building a chainable Supabase mock so tests never
 * hit a real database.  The mock is intentionally minimal — it stubs only the
 * methods the auth + users modules actually call.
 *
 * Usage in a test file:
 *
 *   jest.mock('../../config/supabase', () => require('../helpers/mockSupabase').supabaseMockModule());
 *
 * Configure return values:
 *   - mockDbResponse(data)           → next single DB call returns this
 *   - mockDbQueue([data1, data2, …]) → multiple sequential DB calls return in order;
 *                                       once the queue is exhausted all further calls
 *                                       return the last entry
 *   - mockAuthResponse(data, error)  → next auth.signInWithPassword / getUser
 *   - mockAuthAdminResponse(data)    → next auth.admin.* call
 *   - resetMocks()                   → clear everything
 */

// ── Mutable state ─────────────────────────────────────────────────────────────

type DbResult = { data: unknown; error: unknown };

/** Queue of DB results consumed in order; the last item is re-used when empty */
let dbQueue: DbResult[] = [{ data: null, error: null }];

export let nextAuthResult: { data: unknown; error: unknown } = { data: null, error: null };
export let nextAuthAdminResult: { data: unknown; error: unknown } = { data: null, error: null };

// ── Helpers to configure mock behaviour from tests ────────────────────────────

export function mockDbResponse(data: unknown, error: unknown = null): void {
  dbQueue = [{ data, error }];
}

/** Set a sequence of DB results that will be consumed one per query call. */
export function mockDbQueue(results: DbResult[]): void {
  dbQueue = [...results];
}

export function mockAuthResponse(data: unknown, error: unknown = null): void {
  nextAuthResult = { data, error };
}

export function mockAuthAdminResponse(data: unknown, error: unknown = null): void {
  nextAuthAdminResult = { data, error };
}

export function resetMocks(): void {
  dbQueue = [{ data: null, error: null }];
  nextAuthResult = { data: null, error: null };
  nextAuthAdminResult = { data: null, error: null };
}

// ── Consume next DB result from queue ─────────────────────────────────────────

function consumeDb(): DbResult {
  if (dbQueue.length === 0) return { data: null, error: null };
  // Shift the first item; if this is the last one, leave it (re-use for subsequent calls)
  if (dbQueue.length === 1) return dbQueue[0];
  return dbQueue.shift()!;
}

// ── Chainable query builder stub ──────────────────────────────────────────────

function makeQueryBuilder() {
  const builder: Record<string, unknown> = {};
  const chainMethods = [
    'select', 'insert', 'update', 'delete', 'upsert',
    'eq', 'neq', 'in', 'order', 'limit', 'range', 'filter',
    'is', 'not', 'gte', 'lte', 'gt', 'lt', 'ilike', 'like',
  ];

  chainMethods.forEach((m) => {
    builder[m] = () => builder;
  });

  // Terminal methods — each one resolves the promise by consuming from the queue
  builder['maybeSingle'] = () => Promise.resolve(consumeDb());
  builder['single']      = () => Promise.resolve(consumeDb());
  // Awaiting the builder directly (e.g. for .delete() / .insert() / .update())
  builder['then']        = (resolve: (v: unknown) => unknown, reject?: (v: unknown) => unknown) =>
    Promise.resolve(consumeDb()).then(resolve, reject);

  return builder;
}

// ── Storage stub ──────────────────────────────────────────────────────────────

const storageMock = {
  from: () => ({
    upload: () => Promise.resolve({ error: null }),
    getPublicUrl: () => ({ data: { publicUrl: 'https://example.com/avatar.jpg' } }),
  }),
};

// ── The module factory ────────────────────────────────────────────────────────

export function supabaseMockModule() {
  const serviceClient = {
    from: (_table: string) => makeQueryBuilder(),

    auth: {
      signInWithPassword: () => Promise.resolve(nextAuthResult),
      getUser: () => Promise.resolve(nextAuthResult),
      admin: {
        createUser: () => Promise.resolve(nextAuthAdminResult),
        deleteUser: () => Promise.resolve(nextAuthAdminResult),
        updateUserById: () => Promise.resolve(nextAuthAdminResult),
        listUsers: () => Promise.resolve({ data: { users: [] as Record<string, unknown>[] }, error: null }),
      },
    },

    storage: storageMock,
  };

  // anonClient has the same shape — used for signInWithPassword / getUser in auth flows
  const anonClient = {
    from: (_table: string) => makeQueryBuilder(),

    auth: {
      signInWithPassword: () => Promise.resolve(nextAuthResult),
      getUser: () => Promise.resolve(nextAuthResult),
      admin: {
        createUser: () => Promise.resolve(nextAuthAdminResult),
        deleteUser: () => Promise.resolve(nextAuthAdminResult),
        updateUserById: () => Promise.resolve(nextAuthAdminResult),
        listUsers: () => Promise.resolve({ data: { users: [] as Record<string, unknown>[] }, error: null }),
      },
    },

    storage: storageMock,
  };

  return {
    __esModule: true,
    default: serviceClient,
    anonClient,
  };
}
