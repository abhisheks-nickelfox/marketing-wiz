/**
 * Shared backend constants for ticket/task status management.
 * Import from here rather than re-defining locally in controllers.
 */

// Task status priority order (used for sorting/display — lower number = surfaces first)
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

// Valid transitions map — mirrors VALID_TRANSITIONS in frontend/src/lib/api.js
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
