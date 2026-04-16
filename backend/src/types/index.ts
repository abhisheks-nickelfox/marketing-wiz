import { Request } from 'express';

// ─── Enums ────────────────────────────────────────────────────────────────────

export type UserRole = 'admin' | 'member' | 'super_admin';
export type PromptType = 'pm' | 'campaigns' | 'content';
export type TaskType = 'task' | 'design' | 'development' | 'account_management';
export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';
export type TaskStatus =
  | 'draft'
  | 'in_progress'
  | 'resolved'
  | 'internal_review'
  | 'client_review'
  | 'compliance_review'
  | 'approved'
  | 'closed'
  | 'revisions'
  | 'discarded';
export type LogType = 'estimate' | 'partial' | 'final' | 'revision';

// ─── Domain Models ────────────────────────────────────────────────────────────

export const PERMISSIONS = [
  { key: 'manage_firms',          label: 'Manage Firms',          description: 'Create and edit client firms' },
  { key: 'manage_projects',       label: 'Manage Projects',       description: 'Create, edit and archive projects' },
  { key: 'process_transcripts',   label: 'Process Transcripts',   description: 'Access and process meeting transcripts' },
  { key: 'view_all_tickets',      label: 'View All Tasks',        description: 'See all tasks across the team' },
  { key: 'manage_prompts',        label: 'Manage Prompts',        description: 'Edit AI prompt templates' },
] as const;

export type PermissionKey = typeof PERMISSIONS[number]['key'];

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  permissions: PermissionKey[];
  created_at: string;
}

export interface Firm {
  id: string;
  name: string;
  contact_name: string;
  contact_email: string;
  default_prompt_id: string | null;
  created_at: string;
}

export interface Transcript {
  id: string;
  fireflies_id: string;
  title: string;
  call_date: string;
  duration_sec: number;
  participants: Record<string, unknown>[];
  raw_transcript: string;
  firm_id: string | null;
  archived: boolean;
  created_at: string;
}

export interface Prompt {
  id: string;
  name: string;
  type: PromptType;
  system_prompt: string;
  is_active: boolean;
  firm_id: string | null;
  created_at: string;
}

export interface ProcessingSession {
  id: string;
  transcript_id: string;
  firm_id: string;
  prompt_id: string;
  text_notes: string | null;           // ISSUE-008: nullable in SQL schema
  ai_raw_output: Record<string, unknown> | null; // ISSUE-009: nullable in SQL schema
  created_by: string;
  created_at: string;
}

export interface Task {
  id: string;
  session_id: string | null;
  firm_id: string;
  assignee_id: string | null;
  title: string;
  description: string;
  type: TaskType;
  priority: TaskPriority;
  status: TaskStatus;
  change_note: string;
  estimated_hours: number | null;
  deadline: string | null;
  ai_generated: boolean;
  edited: boolean;
  archived: boolean;
  revision_count: number;
  regeneration_count: number;
  last_regenerated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TimeLog {
  id: string;
  ticket_id: string;
  user_id: string;
  hours: number;
  comment: string;
  log_type: LogType;
  revision_cycle: number;
  created_at: string;
}

// ─── AI / Service types ───────────────────────────────────────────────────────

export interface TaskDraft {
  title: string;
  description: string;
  type: TaskType;
  priority: TaskPriority;
}

export interface SyncResult {
  synced: number;
  created: number;
  updated: number;
  errors: string[];
}

// ─── Request extensions ───────────────────────────────────────────────────────

export interface AuthenticatedRequest extends Request {
  user?: User;
}

// ─── Projects ─────────────────────────────────────────────────────────────────

export interface Project {
  id: string;
  firm_id: string;
  name: string;
  description: string | null;
  status: 'active' | 'archived';
  created_at: string;
  updated_at: string;
  firm_name?: string;
  ticket_count?: number;
}

export interface CreateProjectInput {
  firm_id: string;
  name: string;
  description?: string;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  status?: 'active' | 'archived';
}

// ─── API response helpers ─────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
}
