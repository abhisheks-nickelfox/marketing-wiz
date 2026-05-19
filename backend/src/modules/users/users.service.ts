import bcrypt from 'bcrypt';
import logger from '../../config/logger';
import { User, UserSkill, Skill, ProcessingSession, ProjectMember, TaskAssignee } from '../../models';
import sequelize from '../../config/database';
import { Op } from 'sequelize';
import type { CreateUserDto } from './dto/create-user.dto';
import type { UpdateUserDto } from './dto/update-user.dto';
import { notifyUser } from '../notifications/notifications.service';

// ── Types ────────────────────────────────────────────────────────────────────

export interface SkillWithExperience {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  color: string | null;
  created_at: string;
  experience: string | null;
}

export type { SkillWithExperience as Skill };

export interface UserResult {
  id: string;
  name: string;
  first_name: string | null;
  last_name: string | null;
  phone_number: string | null;
  avatar_url: string | null;
  email: string;
  role: 'admin' | 'member' | 'project_manager';
  member_role: string | null;
  status: 'Active' | 'invited' | 'Disabled';
  permissions: string[];
  skills: SkillWithExperience[];
  rate_amount: number | null;
  rate_frequency: 'Hourly' | 'Daily' | 'Weekly' | 'Monthly' | null;
  created_at: string;
  updated_at: string | null;
}

const BCRYPT_ROUNDS = 12;

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Attaches skills[] (with experience) to an array of raw user rows.
 * Issues a single batched query for all user IDs.
 */
async function attachSkills(users: Record<string, unknown>[]): Promise<UserResult[]> {
  if (users.length === 0) return [];

  const ids = users.map((u) => u.id as string);

  const userSkillRows = await UserSkill.findAll({
    where: { user_id: { [Op.in]: ids } },
    include: [
      {
        model: Skill,
        as: 'skill',
        attributes: ['id', 'name', 'category', 'description', 'color', 'created_at'],
        required: true,
      },
    ],
    raw: false,
  });

  // Build map: user_id → SkillWithExperience[]
  const skillMap: Record<string, SkillWithExperience[]> = {};
  for (const row of userSkillRows) {
    const r = row as unknown as { user_id: string; experience: string | null; skill: Record<string, unknown> };
    const uid = r.user_id;
    if (!skillMap[uid]) skillMap[uid] = [];
    skillMap[uid].push({
      id:          r.skill.id as string,
      name:        r.skill.name as string,
      category:    r.skill.category as string | null,
      description: r.skill.description as string | null,
      color:       r.skill.color as string | null,
      created_at:  r.skill.created_at as string,
      experience:  r.experience ?? null,
    });
  }

  return users.map((u) => ({
    ...(u as object),
    skills: skillMap[u.id as string] ?? [],
  })) as UserResult[];
}

/** Strips password_hash from a raw user row before returning to callers. */
function stripPassword(row: Record<string, unknown>): Record<string, unknown> {
  const { password_hash: _pw, ...rest } = row;
  return rest;
}

// ── Service methods ──────────────────────────────────────────────────────────

// ── Pagination constants ──────────────────────────────────────────────────────

const DEFAULT_USER_LIST_LIMIT = 50;
const MAX_USER_LIST_LIMIT     = 200;

export interface PaginatedUsersResult {
  data:  UserResult[];
  total: number;
  page:  number;
  limit: number;
}

export async function findAllUsers(
  page: number  = 1,
  limit: number = DEFAULT_USER_LIST_LIMIT,
): Promise<PaginatedUsersResult> {
  // Clamp inputs so callers cannot request unlimited rows
  const safePage  = Math.max(1, page);
  const safeLimit = Math.min(MAX_USER_LIST_LIMIT, Math.max(1, limit));
  const offset    = (safePage - 1) * safeLimit;

  // Fetch count and current page concurrently — avoids two sequential round-trips
  const [total, rows] = await Promise.all([
    User.count(),
    User.findAll({
      order:  [['created_at', 'DESC']],
      limit:  safeLimit,
      offset,
      raw:    true,
    }),
  ]);

  const safe = (rows as unknown as Record<string, unknown>[]).map(stripPassword);
  const data = await attachSkills(safe);

  return { data, total, page: safePage, limit: safeLimit };
}

export async function findUserById(id: string): Promise<UserResult | null> {
  const row = await User.findByPk(id, { raw: true });
  if (!row) return null;

  const safe = stripPassword(row as unknown as Record<string, unknown>);
  const [user] = await attachSkills([safe]);
  return user ?? null;
}

export async function createUser(dto: CreateUserDto): Promise<UserResult> {
  const {
    email,
    password,
    role = 'member',
    member_role,
    permissions = [],
    skill_ids = [],
    status = 'Active',
    rate_amount,
    rate_frequency,
  } = dto;

  const name = dto.name?.trim() || email;

  // Check for duplicate email
  const existing = await User.findOne({ where: { email: email.toLowerCase().trim() }, raw: true });
  if (existing) {
    throw Object.assign(new Error('A user with this email already exists'), { statusCode: 400 });
  }

  const userRow = await User.create({
    email: email.toLowerCase().trim(),
    name,
    role,
    member_role: member_role?.trim() ?? null,
    permissions,
    status,
    rate_amount: rate_amount ?? null,
    rate_frequency: rate_frequency ?? null,
  });

  const userId = userRow.id;

  // Assign skills
  if (skill_ids.length > 0) {
    try {
      await replaceSkills(userId, skill_ids);
    } catch (err) {
      logger.error('[users.service] skill assignment failed after user creation:', err);
    }
  }

  const created = stripPassword(userRow.toJSON() as unknown as Record<string, unknown>);
  const [user] = await attachSkills([created]);
  return user;
}

export async function updateUser(id: string, dto: UpdateUserDto): Promise<UserResult | null> {
  const { name, first_name, last_name, phone_number, avatar_url, password, role, member_role, permissions, skill_ids, skills_with_experience, status, rate_amount, rate_frequency } = dto;

  // 1. Build profile patch
  const patch: Record<string, unknown> = {};
  if (name !== undefined)           patch.name           = name.trim();
  if (first_name !== undefined)     patch.first_name     = first_name.trim() || null;
  if (last_name !== undefined)      patch.last_name      = last_name.trim() || null;
  if (phone_number !== undefined)   patch.phone_number   = phone_number?.trim() || null;
  if (avatar_url !== undefined)     patch.avatar_url     = avatar_url || null;
  if (role !== undefined)           patch.role           = role;
  if (member_role !== undefined)    patch.member_role    = member_role.trim() || null;
  if (permissions !== undefined)    patch.permissions    = permissions;
  if (status !== undefined)         patch.status         = status;
  if (rate_amount !== undefined)    patch.rate_amount    = rate_amount ?? null;
  if (rate_frequency !== undefined) patch.rate_frequency = rate_frequency ?? null;
  if (password !== undefined && password) {
    patch.password_hash = await bcrypt.hash(password, 12);
  }

  if (Object.keys(patch).length > 0) {
    await User.update(patch, { where: { id } });
  }

  // 3. Replace skills if provided
  if (skills_with_experience !== undefined) {
    await replaceSkillsWithExperience(id, skills_with_experience);
  } else if (skill_ids !== undefined) {
    await replaceSkills(id, skill_ids);
  }

  // Notify user of admin-initiated changes (fire-and-forget)
  if (Object.keys(patch).length > 0) {
    notifyUser(id, 'Profile updated', 'An admin has updated your profile information.').catch(() => {});
  }
  if (skills_with_experience !== undefined || skill_ids !== undefined) {
    notifyUser(id, 'Skills updated', 'Your skill set has been updated by an admin.').catch(() => {});
  }

  return findUserById(id);
}

/** Replaces a user's skill set with the given skill IDs (no experience). */
async function replaceSkills(userId: string, skillIds: string[]): Promise<void> {
  await UserSkill.destroy({ where: { user_id: userId } });

  const unique = [...new Set(skillIds)];
  if (unique.length === 0) return;

  const rows = unique.map((skill_id) => ({ user_id: userId, skill_id, experience: null }));
  await UserSkill.bulkCreate(rows, { ignoreDuplicates: true });
}

/** Replaces a user's skill set with skills that each carry an experience value. */
export async function replaceSkillsWithExperience(
  userId: string,
  skills: { skill_id: string; experience?: string | null }[],
): Promise<void> {
  await UserSkill.destroy({ where: { user_id: userId } });

  if (skills.length === 0) return;

  // Deduplicate by skill_id — keep the last entry
  const seen = new Map<string, { skill_id: string; experience?: string | null }>();
  for (const s of skills) seen.set(s.skill_id, s);

  const rows = [...seen.values()].map(({ skill_id, experience }) => ({
    user_id: userId,
    skill_id,
    experience: experience ?? null,
  }));

  await UserSkill.bulkCreate(rows, { ignoreDuplicates: true });
}

// ── Invite nonce helpers ─────────────────────────────────────────────────────

/** Writes a new nonce into users.invite_nonce, making any previous token stale. */
export async function storeInviteNonce(userId: string, nonce: string | null): Promise<void> {
  await User.update({ invite_nonce: nonce }, { where: { id: userId } });
}

/** Returns the current invite_nonce for a user, or null if none is set. */
export async function fetchInviteNonce(userId: string): Promise<string | null> {
  const row = await User.findByPk(userId, {
    attributes: ['invite_nonce'],
    raw: true,
  });
  return (row as unknown as { invite_nonce: string | null } | null)?.invite_nonce ?? null;
}

export async function deleteUser(id: string, requesterId: string): Promise<void> {
  if (id === requesterId) {
    throw Object.assign(new Error('Cannot delete your own account'), { statusCode: 400 });
  }

  // Guard: processing_sessions.created_by has an ON DELETE RESTRICT FK.
  // If this user has processed any transcripts the DB will reject the delete
  // with a FK violation. We surface a clear 409 instead of a 500.
  const sessionCount = await ProcessingSession.count({ where: { created_by: id } });
  if (sessionCount > 0) {
    throw Object.assign(
      new Error(
        'Cannot delete user: they have processed transcripts. Reassign or archive their work first.',
      ),
      { statusCode: 409 },
    );
  }

  // Clean up all user-referencing rows before deleting the user.
  // message_reads_message_id_fkey is NO ACTION, so we must pre-delete reads for
  // the user's messages AND all replies to those messages (parent_id CASCADE chain).
  await sequelize.query(`
    WITH RECURSIVE msg_tree AS (
      SELECT id FROM messages WHERE user_id = :userId
      UNION ALL
      SELECT m.id FROM messages m JOIN msg_tree mt ON m.parent_id = mt.id
    )
    DELETE FROM message_reads WHERE message_id IN (SELECT id FROM msg_tree)
  `, { replacements: { userId: id } });
  await sequelize.query(`
    WITH RECURSIVE msg_tree AS (
      SELECT id FROM messages WHERE user_id = :userId
      UNION ALL
      SELECT m.id FROM messages m JOIN msg_tree mt ON m.parent_id = mt.id
    )
    DELETE FROM message_reactions WHERE message_id IN (SELECT id FROM msg_tree)
  `, { replacements: { userId: id } });
  await sequelize.query(`DELETE FROM messages WHERE user_id = :userId`, { replacements: { userId: id } });
  await sequelize.query(`DELETE FROM message_reads WHERE user_id = :userId`, { replacements: { userId: id } });
  await sequelize.query(`DELETE FROM message_reactions WHERE user_id = :userId`, { replacements: { userId: id } });
  await ProjectMember.destroy({ where: { user_id: id } });
  await TaskAssignee.destroy({ where: { user_id: id } });
  await UserSkill.destroy({ where: { user_id: id } });

  const count = await User.destroy({ where: { id } });
  if (count === 0) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }
}
