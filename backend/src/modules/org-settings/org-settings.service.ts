import logger from '../../config/logger';
import { OrgSettings } from '../../models';

// ── Types ────────────────────────────────────────────────────────────────────

export interface OrgSettingsRow {
  id: string;
  logo_url: string | null;
  updated_at: string;
}

// ── Service methods ──────────────────────────────────────────────────────────

export async function getOrgSettings(): Promise<OrgSettingsRow | null> {
  const row = await OrgSettings.findOne({
    attributes: ['id', 'logo_url', 'updated_at'],
    raw: true,
  });

  return row ? (row as unknown as OrgSettingsRow) : null;
}

export async function updateOrgSettings(
  patch: { logo_url?: string },
): Promise<OrgSettingsRow> {
  const existing = await getOrgSettings();

  if (!existing) {
    // No row — insert (edge case: seed was not run)
    const created = await OrgSettings.create({ ...patch });
    return created.toJSON() as OrgSettingsRow;
  }

  await OrgSettings.update(patch, { where: { id: existing.id } });

  const updated = await OrgSettings.findByPk(existing.id, {
    attributes: ['id', 'logo_url', 'updated_at'],
    raw: true,
  });

  if (!updated) throw new Error('OrgSettings not found after update');
  return updated as unknown as OrgSettingsRow;
}
