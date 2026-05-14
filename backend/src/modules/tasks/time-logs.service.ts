import logger from '../../config/logger';
import { TimeLog, User } from '../../models';
import { CreateTimeLogDto } from './dto/create-time-log.dto';
import { UpdateTimeLogDto } from './dto/update-time-log.dto';
import { Ticket } from '../../models';

// ── Types ────────────────────────────────────────────────────────────────────

export interface TimeLogRow {
  id: string;
  ticket_id: string;
  user_id: string;
  hours: number;
  comment: string;
  log_type: string;
  revision_cycle: number;
  created_at: string;
  updated_at: string;
}

export interface TicketAccessRow {
  id: string;
  assignee_id: string;
  status: string;
  revision_count: number;
}

// ── Service methods ──────────────────────────────────────────────────────────

export async function fetchTicketForTimeLogs(
  ticketId: string,
): Promise<TicketAccessRow | null> {
  const row = await Ticket.findByPk(ticketId, {
    attributes: ['id', 'assignee_id', 'status', 'revision_count'],
    raw: true,
  });

  return row ? (row as unknown as TicketAccessRow) : null;
}

export async function fetchTicketAssignee(
  ticketId: string,
): Promise<{ id: string; assignee_id: string } | null> {
  const row = await Ticket.findByPk(ticketId, {
    attributes: ['id', 'assignee_id'],
    raw: true,
  });

  return row ? (row as unknown as { id: string; assignee_id: string }) : null;
}

export async function listTimeLogsForTicket(ticketId: string): Promise<unknown[]> {
  // Raw SQL join to fetch user name/email alongside each log
  const rows = await TimeLog.findAll({
    where: { ticket_id: ticketId },
    order: [['created_at', 'DESC']],
    raw: false, // we'll manually add user data below
  });

  if (rows.length === 0) return [];

  const userIds = [...new Set(rows.map((r) => (r as unknown as TimeLogRow).user_id).filter(Boolean))];
  const userMap: Record<string, { name: string; email: string; avatar_url: string | null }> = {};

  if (userIds.length > 0) {
    const users = await User.findAll({
      where: { id: { [require('sequelize').Op.in]: userIds } },
      attributes: ['id', 'name', 'email', 'avatar_url'],
      raw: true,
    });
    for (const u of users as unknown as { id: string; name: string; email: string; avatar_url: string | null }[]) {
      userMap[u.id] = { name: u.name, email: u.email, avatar_url: u.avatar_url ?? null };
    }
  }

  return rows.map((r) => {
    const log = r.toJSON() as TimeLogRow;
    return { ...log, users: userMap[log.user_id] ?? null };
  });
}

export async function createTimeLog(options: {
  ticketId: string;
  userId: string;
  revisionCycle: number;
  dto: CreateTimeLogDto;
}): Promise<TimeLogRow> {
  const { ticketId, userId, revisionCycle, dto } = options;

  const row = await TimeLog.create({
    ticket_id:      ticketId,
    user_id:        userId,
    hours:          dto.hours,
    comment:        dto.comment ?? '',
    log_type:       dto.log_type,
    revision_cycle: revisionCycle,
  });

  return row.toJSON() as TimeLogRow;
}

export async function fetchTimeLog(
  logId: string,
  ticketId: string,
): Promise<{ id: string; user_id: string; ticket_id: string; log_type: string } | null> {
  const row = await TimeLog.findOne({
    where: { id: logId, ticket_id: ticketId },
    attributes: ['id', 'user_id', 'ticket_id', 'log_type'],
    raw: true,
  });

  return row ? (row as unknown as { id: string; user_id: string; ticket_id: string; log_type: string }) : null;
}

export async function updateTimeLog(
  logId: string,
  dto: UpdateTimeLogDto,
): Promise<TimeLogRow> {
  const payload: Record<string, unknown> = { hours: dto.hours };
  if (dto.comment !== undefined) payload.comment = dto.comment;

  await TimeLog.update(payload, { where: { id: logId } });

  const row = await TimeLog.findByPk(logId, { raw: true });
  if (!row) throw new Error('Time log not found after update');

  return row as unknown as TimeLogRow;
}

export async function deleteTimeLog(logId: string): Promise<void> {
  await TimeLog.destroy({ where: { id: logId } });
}
