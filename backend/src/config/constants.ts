/**
 * Shared backend constants for ticket/task status management.
 * Import from here rather than re-defining locally in controllers.
 */

// ── App / environment ─────────────────────────────────────────────────────────

/** Base URL of the frontend app — used for invite links, password reset links, and emails. */
export const FRONTEND_URL: string =
  process.env.FRONTEND_URL?.trim() ?? 'http://localhost:5173';

// ── User roles ────────────────────────────────────────────────────────────────

/** All valid user roles as stored in the database. */
export const VALID_ROLES = ['admin', 'member', 'project_manager', 'super_admin'] as const;
export type UserRole = typeof VALID_ROLES[number];

/** Roles that count as elevated/admin for RBAC purposes. */
export const ADMIN_ROLES: UserRole[] = ['admin', 'super_admin'];

/** Roles that count as members (any authenticated user). */
export const MEMBER_ROLES: UserRole[] = ['admin', 'member', 'project_manager', 'super_admin'];

// ── User statuses ─────────────────────────────────────────────────────────────

export const VALID_USER_STATUSES = ['Active', 'invited', 'Disabled'] as const;
export type UserStatus = typeof VALID_USER_STATUSES[number];

// ── Task status priority order ────────────────────────────────────────────────
// Lower number = surfaces first in sorted lists.

export const STATUS_PRIORITY: Record<string, number> = {
  draft: 0,
  in_progress: 1,
  revisions: 2,
  internal_review: 3,
  client_review: 4,
  compliance_review: 5,
  approved: 6,
  closed: 7,
  discarded: 8,
};

// Valid ticket/task statuses (derived from STATUS_PRIORITY to keep them in sync)
export const VALID_STATUSES = Object.keys(STATUS_PRIORITY);

/** Active (non-terminal, non-approved) statuses used for overdue deadline checks. */
export const PAST_DEADLINE_STATUSES = [
  'draft',
  'in_progress',
  'revisions',
  'internal_review',
  'client_review',
  'compliance_review',
] as const;

/** Days an approved ticket can sit untouched before it is flagged as stale. */
export const STALE_APPROVED_DAYS = 7;

// ── Task type and priority ────────────────────────────────────────────────────

export const VALID_TASK_TYPES = ['task', 'design', 'development', 'account_management'] as const;
export type TaskType = typeof VALID_TASK_TYPES[number];

export const VALID_TASK_PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;
export type TaskPriority = typeof VALID_TASK_PRIORITIES[number];

// ── Transcript processing ─────────────────────────────────────────────────────

/** Minimum word count for a transcript before ticket generation is allowed. */
export const MIN_TRANSCRIPT_WORDS = 50;

// ── Valid transitions map ─────────────────────────────────────────────────────
// Mirrors VALID_TRANSITIONS in frontend/src/lib/api.js — single source of truth.

export const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ['in_progress', 'discarded'],
  in_progress: ['resolved', 'discarded'],
  resolved: ['internal_review'],
  internal_review: ['client_review', 'revisions'],
  client_review: ['compliance_review', 'revisions'],
  compliance_review: ['approved', 'revisions'],
  approved: ['closed'],
  revisions: ['internal_review'],
  closed: [],
  discarded: [],
};

// ── Token expiry ──────────────────────────────────────────────────────────────

/** Invite token lifetime in milliseconds (24 hours). */
export const INVITE_TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000;

/** Password reset token lifetime in milliseconds (1 hour). */
export const RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000;

// ── AI service ────────────────────────────────────────────────────────────────

/** Groq model used for ticket generation and regeneration. */
export const AI_MODEL = process.env.AI_MODEL?.trim() ?? 'llama-3.3-70b-versatile';

/** Max tokens for ticket generation (list). */
export const AI_GENERATE_MAX_TOKENS = 2000;

/** Max tokens for single ticket regeneration. */
export const AI_REGENERATE_MAX_TOKENS = 500;

/** Sampling temperature for deterministic-leaning output. */
export const AI_TEMPERATURE = 0.3;

// ── Time log limits ───────────────────────────────────────────────────────────

/** Maximum hours value accepted in a single time log entry. */
export const MAX_TIME_LOG_HOURS = 999.99;

/** Minimum hours value accepted in a new time log entry. */
export const MIN_TIME_LOG_HOURS = 0.01;

// ── Pagination ────────────────────────────────────────────────────────────────

/** Default number of recent items returned in dashboard queries. */
export const DASHBOARD_RECENT_LIMIT = 5;
