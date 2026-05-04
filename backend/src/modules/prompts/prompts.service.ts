import logger from '../../config/logger';
import { Prompt } from '../../models';

// ── Types ────────────────────────────────────────────────────────────────────

export interface PromptRow {
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

export async function findAllPrompts(): Promise<PromptRow[]> {
  const rows = await Prompt.findAll({
    order: [['created_at', 'DESC']],
    raw: true,
  });

  return rows as unknown as PromptRow[];
}

export async function createPrompt(dto: CreatePromptDto): Promise<PromptRow> {
  const { name, type, system_prompt, firm_id = null, is_active = true } = dto;

  const row = await Prompt.create({ name, type, system_prompt, firm_id, is_active });
  return row.toJSON() as PromptRow;
}

export async function updatePrompt(id: string, updates: UpdatePromptDto): Promise<PromptRow | null> {
  await Prompt.update(updates as Record<string, unknown>, { where: { id } });

  const row = await Prompt.findByPk(id, { raw: true });
  return row ? (row as unknown as PromptRow) : null;
}
