export interface CreateUserDto {
  name: string;
  email: string;
  password: string;
  role?: 'admin' | 'member';
  /** Free-text job title — only relevant when role = 'member' */
  member_role?: string;
  permissions?: string[];
  /** Skill UUIDs to assign on creation */
  skill_ids?: string[];
  status?: 'Active' | 'invited' | 'Disabled';
}
