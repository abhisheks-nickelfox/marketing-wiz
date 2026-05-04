export interface CreateSkillDto {
  name: string;
  category?: string;
  description?: string; // ✅ add
  color?: string;       // ✅ add
}