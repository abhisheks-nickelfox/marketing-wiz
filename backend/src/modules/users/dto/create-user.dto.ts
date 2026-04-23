export interface CreateUserDto {
  /** Optional — defaults to email when not provided (filled in during onboarding). */
  name?: string;
  email: string;
  password: string;
  role?: 'admin' | 'member' | 'project_manager' | 'super_admin';
  /** Free-text job title — only relevant when role = 'member' */
  member_role?: string;
  permissions?: string[];
  /** Skill UUIDs to assign on creation */
  skill_ids?: string[];
  status?: 'Active' | 'invited' | 'Disabled';
  rate_amount?: number | null;
  rate_frequency?: 'Hourly' | 'Daily' | 'Weekly' | 'Monthly' | null;
}
