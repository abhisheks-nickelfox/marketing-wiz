import { Op } from 'sequelize';
import { Skill, UserSkill, User } from '../../models';
import type { CreateSkillDto } from './dto/create-skill.dto';

export interface SkillMember {
  id: string;
  name: string;
  avatar_url: string | null;
}

export interface SkillWithMembers {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  color: string | null;
  created_at: string;
  members: SkillMember[];
}

// ─── Attach members to a list of skills ──────────────────────────────────────

async function attachMembers(skillIds: string[]): Promise<Record<string, SkillMember[]>> {
  if (skillIds.length === 0) return {};

  const rows = await UserSkill.findAll({
    where: { skill_id: { [Op.in]: skillIds } },
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'avatar_url'],
        required: true,
      },
    ],
    raw: false,
  });

  const map: Record<string, SkillMember[]> = {};
  for (const row of rows) {
    const r = row as unknown as { skill_id: string; user: { id: string; name: string; avatar_url: string | null } };
    if (!map[r.skill_id]) map[r.skill_id] = [];
    if (r.user) map[r.skill_id].push({ id: r.user.id, name: r.user.name, avatar_url: r.user.avatar_url });
  }
  return map;
}

// ─── List all skills ──────────────────────────────────────────────────────────

export async function findAllSkills(): Promise<SkillWithMembers[]> {
  const rows = await Skill.findAll({
    order: [
      ['category', 'ASC NULLS LAST'],
      ['name', 'ASC'],
    ],
    raw: true,
  });

  const skills = rows as unknown as Omit<SkillWithMembers, 'members'>[];
  const membersMap = await attachMembers(skills.map((s) => s.id));

  return skills.map((s) => ({ ...s, members: membersMap[s.id] ?? [] }));
}

// ─── Create a skill ───────────────────────────────────────────────────────────

export async function createSkill(dto: CreateSkillDto): Promise<SkillWithMembers> {
  try {
    const row = await Skill.create({
      name: dto.name.trim(),
      category: dto.category?.trim() || null,
      description: dto.description?.trim() || null,
      color: dto.color || null,
    });

    return { ...(row.toJSON() as Omit<SkillWithMembers, 'members'>), members: [] };
  } catch (err: unknown) {
    const e = err as { name?: string; parent?: { code?: string } };
    if (e.parent?.code === '23505' || e.name === 'SequelizeUniqueConstraintError') {
      throw Object.assign(new Error(`Skill "${dto.name}" already exists`), { statusCode: 409 });
    }
    throw err;
  }
}

// ─── Find or create a skill by name (case-insensitive) ───────────────────────

export async function findOrCreateSkillByName(name: string): Promise<string> {
  const trimmed = name.trim();

  const existing = await Skill.findOne({
    where: { name: { [Op.iLike]: trimmed } },
    attributes: ['id'],
    raw: true,
  });

  if (existing) return (existing as unknown as { id: string }).id;

  const created = await Skill.create({ name: trimmed, category: null });
  return created.id;
}

// ─── Update a skill ───────────────────────────────────────────────────────────

export async function updateSkill(id: string, dto: Partial<CreateSkillDto>): Promise<SkillWithMembers> {
  const patch: Record<string, unknown> = {};
  if (dto.name !== undefined)        patch.name        = dto.name.trim();
  if (dto.category !== undefined)    patch.category    = dto.category.trim() || null;
  if (dto.description !== undefined) patch.description = dto.description.trim() || null;
  if (dto.color !== undefined)       patch.color       = dto.color || null;

  await Skill.update(patch, { where: { id } });

  const row = await Skill.findByPk(id, { raw: true });
  if (!row) throw Object.assign(new Error('Skill not found'), { statusCode: 404 });

  const membersMap = await attachMembers([id]);
  return { ...(row as unknown as Omit<SkillWithMembers, 'members'>), members: membersMap[id] ?? [] };
}

// ─── Set members for a skill ──────────────────────────────────────────────────

export async function setSkillMembers(skillId: string, userIds: string[]): Promise<void> {
  await UserSkill.destroy({ where: { skill_id: skillId } });

  if (userIds.length === 0) return;

  const rows = userIds.map((uid) => ({ user_id: uid, skill_id: skillId, experience: null }));
  await UserSkill.bulkCreate(rows, { ignoreDuplicates: true });
}

// ─── Delete a skill ───────────────────────────────────────────────────────────

export async function deleteSkill(id: string): Promise<void> {
  // UserSkill rows cascade via DB FK ON DELETE CASCADE — no manual cleanup needed
  await Skill.destroy({ where: { id } });
}
