export interface UpdateUserDto {
  name?: string;
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  avatar_url?: string;
  password?: string;
  role?: 'admin' | 'member';
  /** Free-text job title — only relevant when role = 'member' */
  member_role?: string;
  permissions?: string[];
  /** Replaces the full skill set for this user */
  skill_ids?: string[];
  status?: 'Active' | 'invited' | 'Disabled';
}
