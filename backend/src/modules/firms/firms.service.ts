import logger from '../../config/logger';
import { Firm } from '../../models';
import sequelize from '../../config/database';
import { QueryTypes } from 'sequelize';
import type { CreateFirmDto } from './dto/create-firm.dto';
import type { UpdateFirmDto } from './dto/update-firm.dto';

// ── Types ────────────────────────────────────────────────────────────────────

export interface FirmRow {
  id: string;
  name: string;
  location: string | null;
  address: string | null;
  website: string | null;
  logo_url: string | null;
  description: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_role: string | null;
  contact_phone: string | null;
  account_manager_id: string | null;
  default_prompt_id: string | null;
  created_at: string;
}

// Re-export DTOs so existing controller imports from firms.service still resolve
export type { CreateFirmDto, UpdateFirmDto };

export interface FirmWithStats extends FirmRow {
  ticket_count: number;
  pending_count: number;
  draft_count: number;
  last_activity: string | null;
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

export interface FirmDetail extends FirmRow {
  tickets: FirmTicket[];
  stats: {
    total: number;
    draft: number;
    approved: number;
    resolved: number;
  };
}

// ── Pagination constants ──────────────────────────────────────────────────────

const DEFAULT_FIRM_LIST_LIMIT = 50;
const MAX_FIRM_LIST_LIMIT     = 200;

export interface PaginatedFirmsResult {
  data:  FirmWithStats[];
  total: number;
  page:  number;
  limit: number;
}

// ── Service methods ──────────────────────────────────────────────────────────

export async function findAllFirms(
  page: number  = 1,
  limit: number = DEFAULT_FIRM_LIST_LIMIT,
): Promise<PaginatedFirmsResult> {
  // Clamp inputs
  const safePage  = Math.max(1, page);
  const safeLimit = Math.min(MAX_FIRM_LIST_LIMIT, Math.max(1, limit));
  const offset    = (safePage - 1) * safeLimit;

  // Fetch count and current page concurrently
  const [total, firms] = await Promise.all([
    Firm.count(),
    Firm.findAll({
      order:  [['name', 'ASC']],
      limit:  safeLimit,
      offset,
      raw:    true,
    }),
  ]);

  if (firms.length === 0) {
    return { data: [], total, page: safePage, limit: safeLimit };
  }

  // Enrich only the current page's firms with stats — not the entire table
  const pageIds = (firms as unknown as FirmRow[]).map((f) => f.id);

  const statsRows = await sequelize.query<{
    firm_id: string;
    total_tickets: number;
    draft_count: number;
    approved_count: number;
    last_ticket_at: string | null;
  }>(
    `SELECT * FROM v_firm_ticket_stats WHERE firm_id IN (:ids)`,
    { replacements: { ids: pageIds }, type: QueryTypes.SELECT },
  );

  const statsMap: Record<string, typeof statsRows[0]> = {};
  for (const row of statsRows) statsMap[row.firm_id] = row;

  const data = (firms as unknown as FirmRow[]).map((f) => {
    const s = statsMap[f.id];
    return {
      ...f,
      ticket_count:  s?.total_tickets  ?? 0,
      pending_count: s?.approved_count ?? 0,
      draft_count:   s?.draft_count    ?? 0,
      last_activity: s?.last_ticket_at ?? null,
    };
  });

  return { data, total, page: safePage, limit: safeLimit };
}

export async function findFirmById(id: string): Promise<FirmDetail | null> {
  const firm = await Firm.findByPk(id, { raw: true });
  if (!firm) return null;

  // Fetch tasks for this firm including assignee join via raw query for flexibility
  const firmTasks = await sequelize.query<{  // eslint-disable-line
    id: string;
    title: string;
    status: string;
    type: string;
    priority: string;
    estimated_hours: number | null;
    created_at: string;
    updated_at: string;
    assignee_id: string | null;
    assignee_name: string | null;
  }>(
    `SELECT t.id, t.title, t.status, t.type, t.priority, t.estimated_hours,
            t.created_at, t.updated_at, t.assignee_id,
            u.name AS assignee_name
     FROM tickets t
     LEFT JOIN users u ON u.id = t.assignee_id
     WHERE t.firm_id = :firm_id
     ORDER BY t.created_at DESC`,
    { replacements: { firm_id: id }, type: QueryTypes.SELECT },
  );

  const taskList: FirmTicket[] = firmTasks.map((t) => ({
    id:              t.id,
    title:           t.title,
    status:          t.status,
    type:            t.type,
    priority:        t.priority,
    estimated_hours: t.estimated_hours,
    created_at:      t.created_at,
    updated_at:      t.updated_at,
    assignee:        t.assignee_id ? { id: t.assignee_id, name: t.assignee_name ?? '' } : null,
  }));

  const stats = {
    total:    taskList.length,
    draft:    taskList.filter((t) => t.status === 'draft').length,
    approved: taskList.filter((t) => t.status === 'approved').length,
    resolved: taskList.filter((t) => t.status === 'resolved').length,
  };

  return { ...(firm as unknown as FirmRow), tickets: taskList, stats };
}

export async function createFirm(dto: CreateFirmDto): Promise<FirmRow> {
  try {
    const row = await Firm.create({
      name:               dto.name,
      location:           dto.location ?? null,
      address:            dto.address ?? null,
      website:            dto.website ?? null,
      logo_url:           dto.logo_url ?? null,
      description:        dto.description ?? null,
      contact_name:       dto.contact_name ?? null,
      contact_email:      dto.contact_email ?? null,
      contact_role:       dto.contact_role ?? null,
      contact_phone:      dto.contact_phone ?? null,
      account_manager_id: dto.account_manager_id ?? null,
      default_prompt_id:  dto.default_prompt_id ?? null,
    });

    return row.toJSON() as FirmRow;
  } catch (err: unknown) {
    const e = err as { name?: string; parent?: { code?: string; constraint?: string } };
    if (e.parent?.code === '23505' || e.name === 'SequelizeUniqueConstraintError') {
      const ex = new Error('A firm with this name already exists.') as Error & { statusCode: number };
      ex.statusCode = 409;
      throw ex;
    }
    logger.error('[firms.service] createFirm error:', err);
    throw err;
  }
}

export async function updateFirm(id: string, updates: UpdateFirmDto): Promise<FirmRow | null> {
  await Firm.update(updates as Record<string, unknown>, { where: { id } });

  const row = await Firm.findByPk(id, { raw: true });
  return row ? (row as unknown as FirmRow) : null;
}

export async function deleteFirm(id: string): Promise<boolean> {
  const count = await Firm.destroy({ where: { id } });
  return count > 0;
}
