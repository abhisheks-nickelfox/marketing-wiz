import logger from '../../config/logger';
import supabase from '../../config/supabase';

// ── Types ────────────────────────────────────────────────────────────────────

export interface Prompt {
  id: string;
  name: string;
  type: 'pm' | 'campaigns' | 'content';
  system_prompt: string;
  firm_id: string | null;
  is_active: boolean;
  created_at: string;
}

export interface CreatePromptDto {
  name: string;
  type: 'pm' | 'campaigns' | 'content';
  system_prompt: string;
  firm_id?: string | null;
  is_active?: boolean;
}

export interface UpdatePromptDto {
  name?: string;
  type?: 'pm' | 'campaigns' | 'content';
  system_prompt?: string;
  firm_id?: string | null;
  is_active?: boolean;
}

// ── Service methods ──────────────────────────────────────────────────────────

export async function findAllPrompts(): Promise<Prompt[]> {
  const { data, error } = await supabase
    .from('prompts')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('[prompts.service] findAllPrompts error:', error);
    throw new Error(error.message);
  }

  return (data ?? []) as Prompt[];
}

export async function createPrompt(dto: CreatePromptDto): Promise<Prompt> {
  const { name, type, system_prompt, firm_id = null, is_active = true } = dto;

  const { data, error } = await supabase
    .from('prompts')
    .insert({ name, type, system_prompt, firm_id, is_active })
    .select()
    .single();

  if (error) {
    logger.error('[prompts.service] createPrompt error:', error);
    throw new Error(error.message);
  }

  return data as Prompt;
}

export async function updatePrompt(id: string, updates: UpdatePromptDto): Promise<Prompt | null> {
  const { data, error } = await supabase
    .from('prompts')
    .update(updates as Record<string, unknown>)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    logger.error('[prompts.service] updatePrompt error:', error);
    throw new Error(error.message);
  }

  return data as Prompt | null;
}
