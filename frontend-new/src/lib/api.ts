// ── API client for frontend-new ───────────────────────────────────────────────
// All requests go through this module. Never use fetch() directly in components.

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000/api';

function getToken(): string | null {
  return localStorage.getItem('mw_token');
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const token = getToken();

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  const json = (await res.json()) as unknown;

  if (!res.ok) {
    const err = json as { error?: string };
    throw new Error(err.error ?? `Request failed with status ${res.status}`);
  }

  return json as T;
}

// ── Auth API ──────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'member' | 'super_admin';
  permissions: string[];
}

export const authApi = {
  login: (email: string, password: string) =>
    request<{ data: { user: AuthUser; token: string } }>('POST', '/auth/login', {
      email,
      password,
    }).then((r) => r.data),

  me: () =>
    request<{ data: AuthUser }>('GET', '/auth/me').then((r) => r.data),
};

// ── Shared types ─────────────────────────────────────────────────────────────

export interface Skill {
  id: string;
  name: string;
  category: string | null;
  created_at: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'member' | 'super_admin';
  member_role: string | null;
  status: 'Active' | 'invited' | 'Disabled';
  permissions: string[];
  skills: Skill[];
  created_at: string;
  updated_at: string | null;
}

export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  role?: 'admin' | 'member';
  member_role?: string;
  permissions?: string[];
  skill_ids?: string[];
  status?: 'Active' | 'invited' | 'Disabled';
}

export interface UpdateUserPayload {
  name?: string;
  password?: string;
  role?: 'admin' | 'member';
  member_role?: string;
  permissions?: string[];
  skill_ids?: string[];
  status?: 'Active' | 'invited' | 'Disabled';
}

// ── Users API ─────────────────────────────────────────────────────────────────

export const usersApi = {
  list: () =>
    request<{ data: User[] }>('GET', '/users').then((r) => r.data),

  get: (id: string) =>
    request<{ data: User }>('GET', `/users/${id}`).then((r) => r.data),

  create: (payload: CreateUserPayload) =>
    request<{ data: User }>('POST', '/users', payload).then((r) => r.data),

  update: (id: string, payload: UpdateUserPayload) =>
    request<{ data: User }>('PATCH', `/users/${id}`, payload).then((r) => r.data),

  delete: (id: string) =>
    request<{ message: string }>('DELETE', `/users/${id}`),
};

// ── Member Roles API ──────────────────────────────────────────────────────────

export interface MemberRole {
  id: string;
  name: string;
  created_at: string;
}

export const memberRolesApi = {
  list: () =>
    request<{ data: MemberRole[] }>('GET', '/member-roles').then((r) => r.data),

  create: (name: string) =>
    request<{ data: MemberRole }>('POST', '/member-roles', { name }).then((r) => r.data),

  delete: (id: string) =>
    request<{ message: string }>('DELETE', `/member-roles/${id}`),
};

// ── Skills API ────────────────────────────────────────────────────────────────

export const skillsApi = {
  list: () =>
    request<{ data: Skill[] }>('GET', '/skills').then((r) => r.data),

  create: (payload: { name: string; category?: string }) =>
    request<{ data: Skill }>('POST', '/skills', payload).then((r) => r.data),

  delete: (id: string) =>
    request<{ message: string }>('DELETE', `/skills/${id}`),
};
