import logger from '../../config/logger';
import supabase from '../../config/supabase';
import { CreateTimeLogDto } from './dto/create-time-log.dto';
import { UpdateTimeLogDto } from './dto/update-time-log.dto';

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

/**
 * Fetch the ticket row needed for access-control checks on time-log operations.
 * Returns null if the ticket does not exist.
 */
export async function fetchTicketForTimeLogs(
  ticketId: string,
): Promise<TicketAccessRow | null> {
  const { data, error } = await supabase
    .from('tickets')
    .select('id, assignee_id, status, revision_count')
    .eq('id', ticketId)
    .single();

  if (error || !data) return null;
  return data as TicketAccessRow;
}

/**
 * Fetch the ticket row for access-control checks on list operations.
 * Only selects id and assignee_id (cheapest query).
 */
export async function fetchTicketAssignee(
  ticketId: string,
): Promise<{ id: string; assignee_id: string } | null> {
  const { data, error } = await supabase
    .from('tickets')
    .select('id, assignee_id')
    .eq('id', ticketId)
    .single();

  if (error || !data) return null;
  return data as { id: string; assignee_id: string };
}

/**
 * List all time logs for a given ticket, ordered newest-first.
 * Joins the user name and email for display.
 */
export async function listTimeLogsForTicket(ticketId: string): Promise<unknown[]> {
  const { data, error } = await supabase
    .from('time_logs')
    .select('*, users(name, email)')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('[time-logs.service] listTimeLogsForTicket error:', error);
    throw new Error(error.message);
  }

  return data ?? [];
}

/**
 * Insert a new time log for the given ticket, tagged to the current revision cycle.
 * Callers must validate that the ticket is in_progress or revisions before calling.
 */
export async function createTimeLog(options: {
  ticketId: string;
  userId: string;
  revisionCycle: number;
  dto: CreateTimeLogDto;
}): Promise<TimeLogRow> {
  const { ticketId, userId, revisionCycle, dto } = options;

  const { data, error } = await supabase
    .from('time_logs')
    .insert({
      ticket_id:      ticketId,
      user_id:        userId,
      hours:          dto.hours,
      comment:        dto.comment ?? '',
      log_type:       dto.log_type,
      // Tag to current revision cycle for time-history grouping:
      // cycle 0 = initial work; cycle N = after the Nth revisions transition.
      revision_cycle: revisionCycle,
    })
    .select()
    .single();

  if (error) {
    logger.error('[time-logs.service] createTimeLog error:', error);
    throw new Error(error.message);
  }

  return data as TimeLogRow;
}

/**
 * Fetch a single time log, verifying it belongs to the expected ticket.
 * Returns null if not found.
 */
export async function fetchTimeLog(
  logId: string,
  ticketId: string,
): Promise<{ id: string; user_id: string; ticket_id: string; log_type: string } | null> {
  const { data, error } = await supabase
    .from('time_logs')
    .select('id, user_id, ticket_id, log_type')
    .eq('id', logId)
    .eq('ticket_id', ticketId)
    .single();

  if (error || !data) return null;
  return data as { id: string; user_id: string; ticket_id: string; log_type: string };
}

/**
 * Update hours and/or comment on an existing time log.
 */
export async function updateTimeLog(
  logId: string,
  dto: UpdateTimeLogDto,
): Promise<TimeLogRow> {
  const payload: Record<string, unknown> = { hours: dto.hours };
  if (dto.comment !== undefined) payload.comment = dto.comment;

  const { data, error } = await supabase
    .from('time_logs')
    .update(payload)
    .eq('id', logId)
    .select()
    .single();

  if (error) {
    logger.error('[time-logs.service] updateTimeLog error:', error);
    throw new Error(error.message);
  }

  return data as TimeLogRow;
}

/**
 * Permanently delete a time log by ID.
 */
export async function deleteTimeLog(logId: string): Promise<void> {
  const { error } = await supabase.from('time_logs').delete().eq('id', logId);

  if (error) {
    logger.error('[time-logs.service] deleteTimeLog error:', error);
    throw new Error(error.message);
  }
}
