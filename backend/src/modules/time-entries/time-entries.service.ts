import logger from '../../config/logger';
import { Op } from 'sequelize';
import { TimeEntry, Ticket, User } from '../../models';
import type { CreateTimeEntryDto } from './dto/create-time-entry.dto';
import type { UpdateTimeEntryDto } from './dto/update-time-entry.dto';
import type { TaskTimeEntrySummary, TimeEntryWithUser, ProjectTimeEntrySummary, ProjectDirectTimeEntrySummary, SubtaskTimeSummary, TaskDirectTimeSummary } from '../../types';

// ── Types ─────────────────────────────────────────────────────────────────────

interface TimeEntryRow {
  id:               string;
  task_id:          string | null;
  project_id:       string | null;
  user_id:          string;
  started_at:       string;
  ended_at:         string | null;
  duration_seconds: number | null;
  description:      string | null;
  is_billable:      boolean;
  is_running:       boolean;
  created_at:       string;
  updated_at:       string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Enrich a list of raw entry rows with their user data (name, email, avatar_url). */
async function enrichWithUsers(entries: TimeEntryRow[]): Promise<TimeEntryWithUser[]> {
  if (entries.length === 0) return [];

  const userIds = [...new Set(entries.map((e) => e.user_id).filter(Boolean))];
  const userMap: Record<string, { id: string; name: string; email: string; avatar_url: string | null }> = {};

  if (userIds.length > 0) {
    const users = await User.findAll({
      where: { id: { [Op.in]: userIds } },
      attributes: ['id', 'name', 'email', 'avatar_url'],
      raw: true,
    });
    for (const u of users as unknown as { id: string; name: string; email: string; avatar_url: string | null }[]) {
      userMap[u.id] = { id: u.id, name: u.name, email: u.email, avatar_url: u.avatar_url ?? null };
    }
  }

  return entries.map((e) => ({
    ...e,
    user: userMap[e.user_id] ?? { id: e.user_id, name: '', email: '', avatar_url: null },
  }));
}

// ── Service methods ───────────────────────────────────────────────────────────

/**
 * List time entries for a task.
 * - Admins see all entries; members see only their own.
 * - Also returns a subtask summary (one row per direct child task).
 */
export async function listTimeEntries(
  taskId:           string,
  requestingUserId: string,
  isAdmin:          boolean,
): Promise<TaskTimeEntrySummary> {
  const where: Record<string, unknown> = { task_id: taskId };
  if (!isAdmin) where.user_id = requestingUserId;

  const rawEntries = await TimeEntry.findAll({
    where,
    order: [['started_at', 'DESC']],
    raw: true,
  });

  const ownEntries = await enrichWithUsers(rawEntries as unknown as TimeEntryRow[]);

  // Sub-task summary — direct children only, non-running entries
  const subTasks = await Ticket.findAll({
    where: { parent_task_id: taskId },
    attributes: ['id', 'title'],
    raw: true,
  });

  const subtaskSummary = await Promise.all(
    (subTasks as unknown as { id: string; title: string }[]).map(async (sub) => {
      const rawSub = await TimeEntry.findAll({
        where: { task_id: sub.id },
        order: [['started_at', 'DESC']],
        raw: true,
      });
      const subEntries = await enrichWithUsers(rawSub as unknown as TimeEntryRow[]);
      const totalSeconds = (rawSub as unknown as { is_running: boolean; duration_seconds: number | null }[])
        .filter((e) => !e.is_running)
        .reduce((sum, e) => sum + (e.duration_seconds ?? 0), 0);
      return { task_id: sub.id, title: sub.title, total_seconds: totalSeconds, entries: subEntries };
    }),
  );

  // Own total: exclude running entries (no completed duration yet)
  const ownTotalSeconds = (rawEntries as unknown as { is_running: boolean; duration_seconds: number | null }[])
    .filter((e) => !e.is_running)
    .reduce((sum, e) => sum + (e.duration_seconds ?? 0), 0);

  const subtaskTotal = subtaskSummary.reduce((sum, s) => sum + s.total_seconds, 0);

  return {
    own_entries:       ownEntries,
    subtask_summary:   subtaskSummary,
    own_total_seconds: ownTotalSeconds,
    total_seconds:     ownTotalSeconds + subtaskTotal,
  };
}

/**
 * Start a new timer for the user on the given task.
 * Any currently-running timer for this user is automatically stopped first.
 */
export async function startTimer(taskId: string, userId: string): Promise<TimeEntryWithUser> {
  // Stop any existing running timer for this user across all tasks
  const running = await TimeEntry.findOne({
    where: { user_id: userId, is_running: true },
    attributes: ['id', 'started_at'],
    raw: true,
  }) as unknown as { id: string; started_at: string } | null;

  if (running) {
    const now        = new Date();
    const startedAt  = new Date(running.started_at);
    const durationSeconds = Math.floor((now.getTime() - startedAt.getTime()) / 1000);
    await TimeEntry.update(
      { is_running: false, ended_at: now, duration_seconds: durationSeconds },
      { where: { id: running.id } },
    );
    logger.info(`[time-entries.service] Auto-stopped previous timer ${running.id} for user ${userId}`);
  }

  const entry = await TimeEntry.create({
    task_id:    taskId,
    user_id:    userId,
    started_at: new Date(),
    is_running: true,
  });

  const [enriched] = await enrichWithUsers([entry.toJSON() as unknown as TimeEntryRow]);
  return enriched;
}

/**
 * Stop a running timer identified by entryId.
 * Only the owning user can stop their timer.
 */
export async function stopTimer(entryId: string, userId: string, description?: string): Promise<TimeEntryWithUser> {
  const entry = await TimeEntry.findByPk(entryId, {
    attributes: ['id', 'user_id', 'started_at', 'is_running'],
    raw: true,
  }) as unknown as { id: string; user_id: string; started_at: string; is_running: boolean } | null;

  if (!entry) throw Object.assign(new Error('Time entry not found'), { statusCode: 404 });
  if (entry.user_id !== userId) throw Object.assign(new Error('Not authorized'), { statusCode: 403 });
  if (!entry.is_running) throw Object.assign(new Error('Timer is not running'), { statusCode: 400 });

  const now             = new Date();
  const startedAt       = new Date(entry.started_at);
  const durationSeconds = Math.floor((now.getTime() - startedAt.getTime()) / 1000);

  const updatePayload: Record<string, unknown> = { is_running: false, ended_at: now, duration_seconds: durationSeconds };
  if (description) updatePayload.description = description;

  await TimeEntry.update(updatePayload, { where: { id: entryId } });

  const updated = await TimeEntry.findByPk(entryId, { raw: true });
  const [enriched] = await enrichWithUsers([updated as unknown as TimeEntryRow]);
  return enriched;
}

/**
 * Create a manual (non-timer) time entry.
 * Duration is auto-computed from started_at/ended_at when not explicitly provided.
 */
export async function createManualEntry(
  taskId:  string,
  userId:  string,
  dto:     CreateTimeEntryDto,
): Promise<TimeEntryWithUser> {
  // Compute duration when not explicitly provided
  let durationSeconds = dto.duration_seconds ?? null;
  if (!durationSeconds && dto.ended_at) {
    durationSeconds = Math.floor(
      (new Date(dto.ended_at).getTime() - new Date(dto.started_at).getTime()) / 1000,
    );
  }

  const entry = await TimeEntry.create({
    task_id:          taskId,
    user_id:          userId,
    started_at:       new Date(dto.started_at),
    ended_at:         dto.ended_at ? new Date(dto.ended_at) : undefined,
    duration_seconds: durationSeconds ?? undefined,
    description:      dto.description ?? undefined,
    is_running:       false,
  });

  const [enriched] = await enrichWithUsers([entry.toJSON() as unknown as TimeEntryRow]);
  return enriched;
}

/**
 * Update an existing time entry.
 * Admins may update any entry; members may only update their own.
 */
export async function updateEntry(
  entryId: string,
  userId:  string,
  isAdmin: boolean,
  dto:     UpdateTimeEntryDto,
): Promise<TimeEntryWithUser> {
  const entry = await TimeEntry.findByPk(entryId, {
    attributes: ['id', 'user_id', 'started_at', 'ended_at'],
    raw: true,
  }) as unknown as { id: string; user_id: string; started_at: string; ended_at: string | null } | null;

  if (!entry) throw Object.assign(new Error('Time entry not found'), { statusCode: 404 });
  if (!isAdmin && entry.user_id !== userId) throw Object.assign(new Error('Not authorized'), { statusCode: 403 });

  const updates: Record<string, unknown> = {};
  if (dto.started_at       !== undefined) updates.started_at       = new Date(dto.started_at);
  if (dto.ended_at         !== undefined) updates.ended_at         = new Date(dto.ended_at);
  if (dto.duration_seconds !== undefined) updates.duration_seconds = dto.duration_seconds;
  if (dto.description      !== undefined) updates.description      = dto.description;

  // Auto-compute duration when both timestamps are provided but duration is not
  const finalStarted = dto.started_at ? new Date(dto.started_at) : new Date(entry.started_at);
  const finalEnded   = dto.ended_at   ? new Date(dto.ended_at)   : (entry.ended_at ? new Date(entry.ended_at) : null);
  if (dto.duration_seconds === undefined && finalEnded) {
    updates.duration_seconds = Math.floor(
      (finalEnded.getTime() - finalStarted.getTime()) / 1000,
    );
  }

  await TimeEntry.update(updates, { where: { id: entryId } });

  const updated = await TimeEntry.findByPk(entryId, { raw: true });
  const [enriched] = await enrichWithUsers([updated as unknown as TimeEntryRow]);
  return enriched;
}

/**
 * Delete a time entry.
 * Admins may delete any entry; members may only delete their own.
 */
export async function deleteEntry(
  entryId: string,
  userId:  string,
  isAdmin: boolean,
): Promise<void> {
  const entry = await TimeEntry.findByPk(entryId, {
    attributes: ['id', 'user_id'],
    raw: true,
  }) as unknown as { id: string; user_id: string } | null;

  if (!entry) throw Object.assign(new Error('Time entry not found'), { statusCode: 404 });
  if (!isAdmin && entry.user_id !== userId) throw Object.assign(new Error('Not authorized'), { statusCode: 403 });

  await TimeEntry.destroy({ where: { id: entryId } });
}

/**
 * Aggregate all time entries across all top-level tasks in a project.
 * Hierarchy: Project → Task (own entries + subtask rollup).
 * Admins see all users' entries; members see only their own per task.
 */
export async function listProjectTimeEntries(
  projectId: string,
  userId:    string,
  isAdmin:   boolean,
): Promise<ProjectTimeEntrySummary> {
  // 1. Top-level tasks for this project (no parent_task_id)
  const topTasks = await Ticket.findAll({
    where: { project_id: projectId, parent_task_id: null },
    attributes: ['id', 'title'],
    order: [['created_at', 'ASC']],
    raw: true,
  }) as unknown as { id: string; title: string }[];

  let projectTotal = 0;

  const tasks = await Promise.all(topTasks.map(async (task) => {
    // Entries for this task
    const where: Record<string, unknown> = { task_id: task.id };
    if (!isAdmin) where.user_id = userId;

    const rawEntries = await TimeEntry.findAll({
      where,
      order: [['started_at', 'DESC']],
      raw: true,
    });
    const entries = await enrichWithUsers(rawEntries as unknown as TimeEntryRow[]);

    const ownSeconds = (rawEntries as unknown as { is_running: boolean; duration_seconds: number | null }[])
      .filter((e) => !e.is_running)
      .reduce((sum, e) => sum + (e.duration_seconds ?? 0), 0);

    // Subtask rollup
    const subTasks = await Ticket.findAll({
      where: { parent_task_id: task.id },
      attributes: ['id', 'title'],
      raw: true,
    }) as unknown as { id: string; title: string }[];

    const subtasks = await Promise.all(subTasks.map(async (sub) => {
      const subEntries = await TimeEntry.findAll({
        where: { task_id: sub.id, is_running: false },
        attributes: ['duration_seconds'],
        raw: true,
      });
      const total = (subEntries as unknown as { duration_seconds: number | null }[])
        .reduce((sum, e) => sum + (e.duration_seconds ?? 0), 0);
      return { task_id: sub.id, title: sub.title, total_seconds: total };
    }));

    const subtaskSeconds = subtasks.reduce((sum, s) => sum + s.total_seconds, 0);
    const totalSeconds   = ownSeconds + subtaskSeconds;
    projectTotal        += totalSeconds;

    return { task_id: task.id, title: task.title, total_seconds: totalSeconds, own_seconds: ownSeconds, entries, subtasks };
  }));

  return { project_id: projectId, total_seconds: projectTotal, tasks };
}

// ── Project-level time entry functions ────────────────────────────────────────

/**
 * List time entries logged directly on a project (task_id IS NULL) plus a
 * per-task rollup of all time entries on the project's top-level tasks.
 *
 * - Admins see all users' direct project entries; members see only their own.
 * - task_summary always covers all users (it is an aggregated rollup).
 */
export async function listProjectDirectEntries(
  projectId: string,
  userId:    string,
  isAdmin:   boolean,
): Promise<ProjectDirectTimeEntrySummary> {
  // Direct project-level entries (task_id IS NULL, project_id = projectId)
  const directWhere: Record<string, unknown> = { project_id: projectId, task_id: null };
  if (!isAdmin) directWhere.user_id = userId;

  const rawDirect = await TimeEntry.findAll({
    where: directWhere,
    order: [['started_at', 'DESC']],
    raw:   true,
  });

  const projectEntries = await enrichWithUsers(rawDirect as unknown as TimeEntryRow[]);

  const ownTotalSeconds = (rawDirect as unknown as { is_running: boolean; duration_seconds: number | null }[])
    .filter((e) => !e.is_running)
    .reduce((sum, e) => sum + (e.duration_seconds ?? 0), 0);

  // Rollup: top-level tasks for this project and their total seconds
  const topTasks = await Ticket.findAll({
    where: { project_id: projectId, parent_task_id: null },
    attributes: ['id', 'title'],
    order: [['created_at', 'ASC']],
    raw:   true,
  }) as unknown as { id: string; title: string }[];

  const taskSummary: TaskDirectTimeSummary[] = await Promise.all(topTasks.map(async (task) => {
    // All entries directly on this task (any user)
    const rawTaskEntries = await TimeEntry.findAll({
      where: { task_id: task.id },
      order: [['started_at', 'DESC']],
      raw: true,
    });
    const taskEntries = await enrichWithUsers(rawTaskEntries as unknown as TimeEntryRow[]);
    const ownSeconds = (rawTaskEntries as unknown as { is_running: boolean; duration_seconds: number | null }[])
      .filter((e) => !e.is_running)
      .reduce((sum, e) => sum + (e.duration_seconds ?? 0), 0);

    // Direct children subtasks
    const subTasks = await Ticket.findAll({
      where: { parent_task_id: task.id },
      attributes: ['id', 'title'],
      order: [['created_at', 'ASC']],
      raw: true,
    }) as unknown as { id: string; title: string }[];

    const subtasks: SubtaskTimeSummary[] = await Promise.all(subTasks.map(async (sub) => {
      const rawSub = await TimeEntry.findAll({
        where: { task_id: sub.id },
        order: [['started_at', 'DESC']],
        raw: true,
      });
      const subEntries = await enrichWithUsers(rawSub as unknown as TimeEntryRow[]);
      const totalSeconds = (rawSub as unknown as { is_running: boolean; duration_seconds: number | null }[])
        .filter((e) => !e.is_running)
        .reduce((sum, e) => sum + (e.duration_seconds ?? 0), 0);
      return { task_id: sub.id, title: sub.title, total_seconds: totalSeconds, entries: subEntries };
    }));

    const subtaskSeconds = subtasks.reduce((sum, s) => sum + s.total_seconds, 0);
    const totalSeconds   = ownSeconds + subtaskSeconds;

    return {
      task_id:       task.id,
      title:         task.title,
      total_seconds: totalSeconds,
      own_seconds:   ownSeconds,
      entries:       taskEntries,
      subtasks,
    };
  }));

  const taskTotal    = taskSummary.reduce((sum, t) => sum + t.total_seconds, 0);
  const totalSeconds = ownTotalSeconds + taskTotal;

  return {
    project_entries:   projectEntries,
    task_summary:      taskSummary,
    own_total_seconds: ownTotalSeconds,
    total_seconds:     totalSeconds,
  };
}

/**
 * Start a timer directly on a project (not tied to any task).
 * Automatically stops any running timer for this user first (task-level or project-level).
 */
export async function startProjectTimer(
  projectId: string,
  userId:    string,
): Promise<TimeEntryWithUser> {
  // Stop any currently-running timer for this user (covers both task and project timers)
  const running = await TimeEntry.findOne({
    where: { user_id: userId, is_running: true },
    attributes: ['id', 'started_at'],
    raw: true,
  }) as unknown as { id: string; started_at: string } | null;

  if (running) {
    const now             = new Date();
    const durationSeconds = Math.floor((now.getTime() - new Date(running.started_at).getTime()) / 1000);
    await TimeEntry.update(
      { is_running: false, ended_at: now, duration_seconds: durationSeconds },
      { where: { id: running.id } },
    );
    logger.info(`[time-entries.service] Auto-stopped previous timer ${running.id} for user ${userId}`);
  }

  const entry = await TimeEntry.create({
    project_id: projectId,
    task_id:    null,
    user_id:    userId,
    started_at: new Date(),
    is_running: true,
  });

  const [enriched] = await enrichWithUsers([entry.toJSON() as unknown as TimeEntryRow]);
  return enriched;
}

/**
 * Stop a running project-level timer identified by entryId.
 * Only the owning user can stop their timer.
 */
export async function stopProjectTimer(
  entryId:     string,
  userId:      string,
  description?: string,
): Promise<TimeEntryWithUser> {
  const entry = await TimeEntry.findByPk(entryId, {
    attributes: ['id', 'user_id', 'started_at', 'is_running', 'project_id'],
    raw: true,
  }) as unknown as { id: string; user_id: string; started_at: string; is_running: boolean; project_id: string | null } | null;

  if (!entry)            throw Object.assign(new Error('Time entry not found'), { statusCode: 404 });
  if (!entry.project_id) throw Object.assign(new Error('Entry is not a project-level timer'), { statusCode: 400 });
  if (entry.user_id !== userId) throw Object.assign(new Error('Not authorized'), { statusCode: 403 });
  if (!entry.is_running) throw Object.assign(new Error('Timer is not running'), { statusCode: 400 });

  const now             = new Date();
  const durationSeconds = Math.floor((now.getTime() - new Date(entry.started_at).getTime()) / 1000);

  const updatePayload: Record<string, unknown> = { is_running: false, ended_at: now, duration_seconds: durationSeconds };
  if (description) updatePayload.description = description;

  await TimeEntry.update(updatePayload, { where: { id: entryId } });

  const updated = await TimeEntry.findByPk(entryId, { raw: true });
  const [enriched] = await enrichWithUsers([updated as unknown as TimeEntryRow]);
  return enriched;
}

/**
 * Create a manual (non-timer) time entry directly on a project.
 * Duration is auto-computed from started_at/ended_at when not explicitly provided.
 */
export async function createProjectManualEntry(
  projectId: string,
  userId:    string,
  dto:       CreateTimeEntryDto,
): Promise<TimeEntryWithUser> {
  let durationSeconds = dto.duration_seconds ?? null;
  if (!durationSeconds && dto.ended_at) {
    durationSeconds = Math.floor(
      (new Date(dto.ended_at).getTime() - new Date(dto.started_at).getTime()) / 1000,
    );
  }

  const entry = await TimeEntry.create({
    project_id:       projectId,
    task_id:          null,
    user_id:          userId,
    started_at:       new Date(dto.started_at),
    ended_at:         dto.ended_at ? new Date(dto.ended_at) : undefined,
    duration_seconds: durationSeconds ?? undefined,
    description:      dto.description ?? undefined,
    is_running:       false,
  });

  const [enriched] = await enrichWithUsers([entry.toJSON() as unknown as TimeEntryRow]);
  return enriched;
}

/**
 * Delete a project-level time entry.
 * Admins may delete any entry; members may only delete their own.
 */
export async function deleteProjectEntry(
  entryId: string,
  userId:  string,
  isAdmin: boolean,
): Promise<void> {
  const entry = await TimeEntry.findByPk(entryId, {
    attributes: ['id', 'user_id'],
    raw: true,
  }) as unknown as { id: string; user_id: string } | null;

  if (!entry) throw Object.assign(new Error('Time entry not found'), { statusCode: 404 });
  if (!isAdmin && entry.user_id !== userId) throw Object.assign(new Error('Not authorized'), { statusCode: 403 });

  await TimeEntry.destroy({ where: { id: entryId } });
}

/**
 * Return the currently-running timer for the given user (if any).
 * Returns null when no timer is active.
 */
export async function getRunningTimer(userId: string): Promise<unknown | null> {
  const entry = await TimeEntry.findOne({
    where: { user_id: userId, is_running: true },
    raw: false,
  });

  if (!entry) return null;

  const row = entry.toJSON() as unknown as TimeEntryRow;

  // Attach task info for context when this is a task-level timer
  const task = row.task_id
    ? await Ticket.findByPk(row.task_id, {
        attributes: ['id', 'title', 'firm_id'],
        raw: true,
      })
    : null;

  return {
    ...row,
    task:       task ?? null,
    project_id: row.project_id ?? null,
  };
}
