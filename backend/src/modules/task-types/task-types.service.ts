import { QueryTypes } from 'sequelize';
import sequelize from '../../config/database';
import type { CreateTaskTypeDto } from './dto/create-task-type.dto';
import type { UpdateTaskTypeDto } from './dto/update-task-type.dto';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TaskTypeMember {
  id: string;
  name: string;
  avatar_url: string | null;
}

export interface TaskTypeRow {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  created_at: string;
}

export interface TaskType extends TaskTypeRow {
  members: TaskTypeMember[];
  task_count: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function attachMembers(typeIds: string[]): Promise<Record<string, TaskTypeMember[]>> {
  if (typeIds.length === 0) return {};

  const rows = await sequelize.query<{
    task_type_id: string;
    id: string;
    name: string;
    avatar_url: string | null;
  }>(
    `SELECT ttm.task_type_id, u.id, u.name, u.avatar_url
     FROM task_type_members ttm
     JOIN users u ON u.id = ttm.user_id
     WHERE ttm.task_type_id IN (:ids)`,
    { replacements: { ids: typeIds }, type: QueryTypes.SELECT },
  );

  const map: Record<string, TaskTypeMember[]> = {};
  for (const row of rows) {
    if (!map[row.task_type_id]) map[row.task_type_id] = [];
    map[row.task_type_id].push({ id: row.id, name: row.name, avatar_url: row.avatar_url });
  }
  return map;
}

async function attachTaskCounts(typeIds: string[]): Promise<Record<string, number>> {
  if (typeIds.length === 0) return {};

  const rows = await sequelize.query<{ task_type_id: string; cnt: string }>(
    `SELECT task_type_id, COUNT(*) AS cnt
     FROM tickets
     WHERE task_type_id IN (:ids)
     GROUP BY task_type_id`,
    { replacements: { ids: typeIds }, type: QueryTypes.SELECT },
  );

  const map: Record<string, number> = {};
  for (const row of rows) map[row.task_type_id] = parseInt(row.cnt, 10);
  return map;
}

async function replaceMembers(taskTypeId: string, memberIds: string[]): Promise<void> {
  await sequelize.query(
    'DELETE FROM task_type_members WHERE task_type_id = :id',
    { replacements: { id: taskTypeId }, type: QueryTypes.DELETE },
  );

  if (memberIds.length === 0) return;

  const values = memberIds.map((uid) => `('${taskTypeId}', '${uid}')`).join(', ');
  await sequelize.query(
    `INSERT INTO task_type_members (task_type_id, user_id) VALUES ${values} ON CONFLICT DO NOTHING`,
  );
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

export async function findAllTaskTypes(): Promise<TaskType[]> {
  const rows = await sequelize.query<TaskTypeRow>(
    'SELECT id, name, description, color, created_at FROM task_types ORDER BY created_at ASC',
    { type: QueryTypes.SELECT },
  );

  const ids = rows.map((r) => r.id);
  const [membersMap, countsMap] = await Promise.all([attachMembers(ids), attachTaskCounts(ids)]);

  return rows.map((r) => ({ ...r, members: membersMap[r.id] ?? [], task_count: countsMap[r.id] ?? 0 }));
}

export async function createTaskType(dto: CreateTaskTypeDto): Promise<TaskType> {
  const rows = await sequelize.query<TaskTypeRow>(
    `INSERT INTO task_types (name, description, color)
     VALUES (:name, :description, :color)
     RETURNING id, name, description, color, created_at`,
    {
      replacements: {
        name:        dto.name.trim(),
        description: dto.description?.trim() || null,
        color:       dto.color || null,
      },
      type: QueryTypes.SELECT,
    },
  );

  const row = rows[0];
  if (!row) throw new Error('Failed to create task type');

  if (dto.member_ids?.length) await replaceMembers(row.id, dto.member_ids);

  const [membersMap] = await Promise.all([attachMembers([row.id])]);
  return { ...row, members: membersMap[row.id] ?? [], task_count: 0 };
}

export async function updateTaskType(id: string, dto: UpdateTaskTypeDto): Promise<TaskType> {
  const setClauses: string[] = [];
  const replacements: Record<string, unknown> = { id };

  if (dto.name        !== undefined) { setClauses.push('name = :name');              replacements.name        = dto.name.trim(); }
  if (dto.description !== undefined) { setClauses.push('description = :description'); replacements.description = dto.description.trim() || null; }
  if (dto.color       !== undefined) { setClauses.push('color = :color');             replacements.color       = dto.color || null; }

  if (setClauses.length > 0) {
    await sequelize.query(
      `UPDATE task_types SET ${setClauses.join(', ')} WHERE id = :id`,
      { replacements, type: QueryTypes.UPDATE },
    );
  }

  if (dto.member_ids !== undefined) await replaceMembers(id, dto.member_ids);

  const rows = await sequelize.query<TaskTypeRow>(
    'SELECT id, name, description, color, created_at FROM task_types WHERE id = :id',
    { replacements: { id }, type: QueryTypes.SELECT },
  );

  const row = rows[0];
  if (!row) throw Object.assign(new Error('Task type not found'), { statusCode: 404 });

  const [membersMap, countsMap] = await Promise.all([attachMembers([id]), attachTaskCounts([id])]);
  return { ...row, members: membersMap[id] ?? [], task_count: countsMap[id] ?? 0 };
}

export async function deleteTaskType(id: string): Promise<void> {
  await sequelize.query(
    'DELETE FROM task_types WHERE id = :id',
    { replacements: { id }, type: QueryTypes.DELETE },
  );
}
