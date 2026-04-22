import supabase from '../../config/supabase';
import type { CreateSkillDto } from './dto/create-skill.dto';

export interface Skill {
  id: string;
  name: string;
  category: string | null;
  created_at: string;
  experience?: string | null;
}

// ─── List all skills ──────────────────────────────────────────────────────────

export async function findAllSkills(): Promise<Skill[]> {
  const { data, error } = await supabase
    .from('skills')
    .select('id, name, category, created_at')
    .order('category', { ascending: true, nullsFirst: false })
    .order('name', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as Skill[];
}

// ─── Create a skill ───────────────────────────────────────────────────────────

export async function createSkill(dto: CreateSkillDto): Promise<Skill> {
  const { data, error } = await supabase
    .from('skills')
    .insert({ name: dto.name.trim(), category: dto.category?.trim() ?? null })
    .select('id, name, category, created_at')
    .single();

  if (error) {
    if (error.code === '23505') {
      throw Object.assign(new Error(`Skill "${dto.name}" already exists`), { statusCode: 409 });
    }
    throw new Error(error.message);
  }

  return data as Skill;
}

// ─── Find or create a skill by name (case-insensitive) ───────────────────────
// Used during onboarding to allow new skill names without requiring admin auth.

export async function findOrCreateSkillByName(name: string): Promise<string> {
  const trimmed = name.trim();

  const { data: existing } = await supabase
    .from('skills')
    .select('id')
    .ilike('name', trimmed)
    .maybeSingle();

  if (existing) return (existing as { id: string }).id;

  const { data: created, error } = await supabase
    .from('skills')
    .insert({ name: trimmed, category: null })
    .select('id')
    .single();

  if (error) throw new Error(error.message);
  return (created as { id: string }).id;
}

// ─── Delete a skill ───────────────────────────────────────────────────────────
// Cascades to user_skills via FK ON DELETE CASCADE.

export async function deleteSkill(id: string): Promise<void> {
  const { error } = await supabase.from('skills').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
