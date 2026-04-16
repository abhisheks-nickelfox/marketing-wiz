import logger from '../../config/logger';
import supabase from '../../config/supabase';

// ── Types ────────────────────────────────────────────────────────────────────

export interface Firm {
  id: string;
  name: string;
  contact_name: string;
  contact_email: string;
  default_prompt_id: string | null;
  created_at: string;
}

export interface FirmWithStats extends Firm {
  ticket_count: number;
  pending_count: number;
  draft_count: number;
  last_activity: string | null;
}

export interface FirmDetail extends Firm {
  tickets: FirmTicket[];
  stats: {
    total: number;
    draft: number;
    approved: number;
    resolved: number;
  };
}

export interface FirmTicket {
  id: string;
  title: string;
  status: string;
  type: string;
  priority: string;
  estimated_hours: number | null;
  created_at: string;
  updated_at: string;
  assignee: { id: string; name: string } | null;
}

export interface CreateFirmDto {
  name: string;
  contact_name?: string;
  contact_email?: string;
  default_prompt_id?: string | null;
}

export interface UpdateFirmDto {
  name?: string;
  contact_name?: string;
  contact_email?: string;
  default_prompt_id?: string | null;
}

// ── Service methods ──────────────────────────────────────────────────────────

export async function findAllFirms(): Promise<FirmWithStats[]> {
  const { data: firms, error } = await supabase
    .from('firms')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    logger.error('[firms.service] findAllFirms error:', error);
    throw new Error(error.message);
  }

  if ((firms ?? []).length === 0) return [];

  // Single view query for stats — avoids per-firm ticket scans (ISSUE-030)
  const { data: statsRows, error: statsError } = await supabase
    .from('v_firm_ticket_stats')
    .select('*');

  if (statsError) {
    logger.error('[firms.service] findAllFirms stats error:', statsError);
    throw new Error(statsError.message);
  }

  // Index stats by firm_id for O(1) lookup
  const statsMap: Record<string, {
    total_tickets: number;
    approved_count: number;
    draft_count: number;
    last_ticket_at: string | null;
  }> = {};

  for (const row of statsRows ?? []) {
    const r = row as {
      firm_id: string;
      total_tickets: number;
      draft_count: number;
      approved_count: number;
      last_ticket_at: string | null;
    };
    statsMap[r.firm_id] = {
      total_tickets: r.total_tickets ?? 0,
      approved_count: r.approved_count ?? 0,
      draft_count: r.draft_count ?? 0,
      last_ticket_at: r.last_ticket_at ?? null,
    };
  }

  return (firms ?? []).map((f: Record<string, unknown>) => {
    const s = statsMap[f.id as string];
    return {
      ...(f as unknown as Firm),
      ticket_count: s?.total_tickets ?? 0,
      pending_count: s?.approved_count ?? 0,
      draft_count: s?.draft_count ?? 0,
      last_activity: s?.last_ticket_at ?? null,
    };
  });
}

export async function findFirmById(id: string): Promise<FirmDetail | null> {
  const { data: firm, error: firmError } = await supabase
    .from('firms')
    .select('*')
    .eq('id', id)
    .single();

  if (firmError || !firm) return null;

  const { data: tickets, error: ticketsError } = await supabase
    .from('tickets')
    .select(
      `id, title, status, type, priority, estimated_hours, created_at, updated_at,
       assignee:users!tickets_assignee_id_fkey(id, name)`
    )
    .eq('firm_id', id)
    .order('created_at', { ascending: false });

  if (ticketsError) {
    logger.error('[firms.service] findFirmById tickets error:', ticketsError);
    throw new Error(ticketsError.message);
  }

  const ticketList = (tickets ?? []) as unknown as FirmTicket[];

  const stats = {
    total: ticketList.length,
    draft: ticketList.filter((t) => t.status === 'draft').length,
    approved: ticketList.filter((t) => t.status === 'approved').length,
    resolved: ticketList.filter((t) => t.status === 'resolved').length,
  };

  return { ...(firm as Firm), tickets: ticketList, stats };
}

export async function createFirm(dto: CreateFirmDto): Promise<Firm> {
  const { name, contact_name = '', contact_email = '', default_prompt_id = null } = dto;

  const { data, error } = await supabase
    .from('firms')
    .insert({ name, contact_name, contact_email, default_prompt_id })
    .select()
    .single();

  if (error) {
    logger.error('[firms.service] createFirm error:', error);
    throw new Error(error.message);
  }

  return data as Firm;
}

export async function updateFirm(id: string, updates: UpdateFirmDto): Promise<Firm | null> {
  const { data, error } = await supabase
    .from('firms')
    .update(updates as Record<string, unknown>)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    logger.error('[firms.service] updateFirm error:', error);
    throw new Error(error.message);
  }

  return data as Firm | null;
}

export async function deleteFirm(id: string): Promise<boolean> {
  // Pre-delete existence check — Supabase delete is a no-op on missing rows
  const { data: existing, error: fetchErr } = await supabase
    .from('firms')
    .select('id')
    .eq('id', id)
    .single();

  if (fetchErr || !existing) return false;

  const { error } = await supabase.from('firms').delete().eq('id', id);

  if (error) {
    logger.error('[firms.service] deleteFirm error:', error);
    throw new Error(error.message);
  }

  return true;
}
