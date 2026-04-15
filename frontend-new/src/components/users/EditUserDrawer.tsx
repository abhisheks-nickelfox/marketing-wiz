import { useState, useEffect } from 'react';
import { Save01, Plus, X } from '@untitled-ui/icons-react';
import SlideOver from '../ui/SlideOver';
import MultiSelect from '../ui/MultiSelect';
import Avatar from '../ui/Avatar';
import { usersApi, skillsApi, memberRolesApi } from '../../lib/api';
import type { User, Skill, MemberRole } from '../../lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────

interface EditUserDrawerProps {
  user: User | null;
  open: boolean;
  onClose: () => void;
  onSaved: (updated: User) => void;
}

// ── Inline add panel (reused from AddUserPage) ────────────────────────────────

interface InlineAddProps {
  title: string;
  fields: { key: string; placeholder: string }[];
  error: string;
  saving: boolean;
  onSave: (values: Record<string, string>) => Promise<void>;
  onCancel: () => void;
}

function InlineAddPanel({ title, fields, error, saving, onSave, onCancel }: InlineAddProps) {
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(fields.map((f) => [f.key, '']))
  );
  return (
    <div className="mt-2 bg-[#F9FAFB] border border-[#E9EAEB] rounded-lg p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-[#414651]">{title}</span>
        <button type="button" onClick={onCancel} className="text-[#717680] hover:text-[#414651]">
          <X width={15} height={15} />
        </button>
      </div>
      <div className="flex gap-2">
        {fields.map((f) => (
          <input key={f.key} type="text" value={values[f.key]}
            onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
            placeholder={f.placeholder}
            className="flex-1 bg-white border border-[#D5D7DA] rounded-lg px-3 py-2 text-sm text-[#181D27] placeholder-[#717680] focus:outline-none focus:ring-2 focus:ring-[#9E77ED] focus:border-transparent"
          />
        ))}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button type="button" onClick={() => onSave(values)} disabled={saving}
        className="self-start inline-flex items-center gap-1.5 bg-[#7F56D9] hover:bg-[#6941C6] disabled:opacity-50 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors">
        {saving ? 'Adding…' : 'Add'}
      </button>
    </div>
  );
}

// ── EditUserDrawer ─────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: 'Active',   label: 'Active' },
  { value: 'invited',  label: 'Invited' },
  { value: 'Disabled', label: 'Disabled' },
];

const ROLE_OPTIONS = [
  { value: 'admin',  label: 'Admin' },
  { value: 'member', label: 'Member' },
];

const inputCls = 'w-full bg-white border border-[#D5D7DA] rounded-lg px-3 py-2.5 text-sm text-[#181D27] placeholder-[#717680] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#9E77ED] focus:border-transparent';

export default function EditUserDrawer({ user, open, onClose, onSaved }: EditUserDrawerProps) {
  // Form state
  const [name,            setName]            = useState('');
  const [roles,           setRoles]           = useState<string[]>([]);
  const [status,          setStatus]          = useState<string[]>([]);
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [selectedSkillIds,setSelectedSkillIds]= useState<string[]>([]);

  // Catalogs
  const [memberRoles,        setMemberRoles]        = useState<MemberRole[]>([]);
  const [memberRolesLoading, setMemberRolesLoading] = useState(true);
  const [skills,             setSkills]             = useState<Skill[]>([]);
  const [skillsLoading,      setSkillsLoading]      = useState(true);

  // Inline add panels
  const [showRoleForm,  setShowRoleForm]  = useState(false);
  const [roleAddError,  setRoleAddError]  = useState('');
  const [roleAdding,    setRoleAdding]    = useState(false);
  const [showSkillForm, setShowSkillForm] = useState(false);
  const [skillAddError, setSkillAddError] = useState('');
  const [skillAdding,   setSkillAdding]   = useState(false);

  // Submit state
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const isMember = roles.includes('member');

  // Populate form when user changes
  useEffect(() => {
    if (!user) return;
    setName(user.name);
    setRoles([user.role === 'super_admin' ? 'admin' : user.role]);
    setStatus([user.status]);
    setSelectedSkillIds(user.skills.map((s) => s.id));
    setError('');
    setShowRoleForm(false);
    setShowSkillForm(false);
  }, [user]);

  // Load catalogs once
  useEffect(() => {
    memberRolesApi.list()
      .then(setMemberRoles).catch(() => setMemberRoles([]))
      .finally(() => setMemberRolesLoading(false));
    skillsApi.list()
      .then(setSkills).catch(() => setSkills([]))
      .finally(() => setSkillsLoading(false));
  }, []);

  // Set member role selection after catalogs + user are both loaded
  useEffect(() => {
    if (!user || memberRolesLoading) return;
    if (user.member_role) {
      const match = memberRoles.find((r) => r.name === user.member_role);
      setSelectedRoleIds(match ? [match.id] : []);
    } else {
      setSelectedRoleIds([]);
    }
  }, [user, memberRoles, memberRolesLoading]);

  // ── Catalog add handlers ────────────────────────────────────────────────────

  async function handleAddRole(vals: Record<string, string>) {
    if (!vals.name?.trim()) { setRoleAddError('Role name is required'); return; }
    setRoleAdding(true); setRoleAddError('');
    try {
      const created = await memberRolesApi.create(vals.name.trim());
      setMemberRoles((p) => [...p, created]);
      setSelectedRoleIds((p) => [...p, created.id]);
      setShowRoleForm(false);
    } catch (e) { setRoleAddError((e as Error).message); }
    finally { setRoleAdding(false); }
  }

  async function handleAddSkill(vals: Record<string, string>) {
    if (!vals.name?.trim()) { setSkillAddError('Skill name is required'); return; }
    setSkillAdding(true); setSkillAddError('');
    try {
      const created = await skillsApi.create({ name: vals.name.trim(), category: vals.category?.trim() || undefined });
      setSkills((p) => [...p, created]);
      setSelectedSkillIds((p) => [...p, created.id]);
      setShowSkillForm(false);
    } catch (e) { setSkillAddError((e as Error).message); }
    finally { setSkillAdding(false); }
  }

  // ── Save ────────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!user) return;
    if (!name.trim() || roles.length === 0 || status.length === 0) {
      setError('Name, role and status are required.');
      return;
    }

    const memberRoleName = isMember && selectedRoleIds.length > 0
      ? memberRoles.find((r) => r.id === selectedRoleIds[0])?.name
      : undefined;

    setSaving(true); setError('');
    try {
      const updated = await usersApi.update(user.id, {
        name:        name.trim(),
        role:        roles[0] as 'admin' | 'member',
        member_role: memberRoleName ?? (isMember ? undefined : ''),
        status:      status[0] as User['status'],
        skill_ids:   selectedSkillIds,
      });
      onSaved(updated);
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  // ── Option lists ────────────────────────────────────────────────────────────

  const memberRoleOptions = memberRoles.map((r) => ({ value: r.id, label: r.name }));
  const skillOptions      = skills.map((s) => ({
    value: s.id,
    label: s.category ? `${s.name} (${s.category})` : s.name,
  }));

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title="Edit team member"
      subtitle={user ? `Updating ${user.name}'s profile` : undefined}
    >
      {user && (
        <div className="flex flex-col gap-5">

          {/* Avatar preview */}
          <div className="flex items-center gap-3 pb-4 border-b border-[#F2F4F7]">
            <Avatar name={user.name} size="lg" />
            <div>
              <p className="text-sm font-semibold text-[#181D27]">{user.name}</p>
              <p className="text-sm text-[#717680]">{user.email}</p>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[#414651]">Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Full name" className={inputCls} />
          </div>

          {/* Status */}
          <MultiSelect
            label="Status"
            options={STATUS_OPTIONS}
            value={status}
            onChange={setStatus}
            columns={1}
          />

          {/* System Role */}
          <MultiSelect
            label="Role"
            options={ROLE_OPTIONS}
            value={roles}
            onChange={setRoles}
            columns={1}
          />

          {/* Member Role — visible when role = member */}
          {isMember && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[#414651]">
                Member Role
                <span className="ml-1 text-[#717680] font-normal">(job title)</span>
              </label>
              {memberRolesLoading ? (
                <p className="text-sm text-[#717680]">Loading…</p>
              ) : (
                <MultiSelect
                  placeholder="Select a role"
                  options={memberRoleOptions}
                  value={selectedRoleIds}
                  onChange={setSelectedRoleIds}
                  columns={1}
                  searchable
                  searchPlaceholder="Search roles…"
                />
              )}
              {!showRoleForm ? (
                <button type="button" onClick={() => setShowRoleForm(true)}
                  className="mt-1 inline-flex items-center gap-1.5 text-sm text-[#6941C6] hover:text-[#53389E] font-medium">
                  <Plus width={13} height={13} /> Add new role
                </button>
              ) : (
                <InlineAddPanel
                  title="New member role"
                  fields={[{ key: 'name', placeholder: 'Role name *' }]}
                  error={roleAddError} saving={roleAdding}
                  onSave={handleAddRole}
                  onCancel={() => { setShowRoleForm(false); setRoleAddError(''); }}
                />
              )}
            </div>
          )}

          {/* Skills */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[#414651]">Skills</label>
            {skillsLoading ? (
              <p className="text-sm text-[#717680]">Loading…</p>
            ) : (
              <MultiSelect
                placeholder="Select skills"
                options={skillOptions}
                value={selectedSkillIds}
                onChange={setSelectedSkillIds}
                columns={2}
                searchable
                searchPlaceholder="Search skills…"
              />
            )}
            {!showSkillForm ? (
              <button type="button" onClick={() => setShowSkillForm(true)}
                className="mt-1 inline-flex items-center gap-1.5 text-sm text-[#6941C6] hover:text-[#53389E] font-medium">
                <Plus width={13} height={13} /> Add new skill
              </button>
            ) : (
              <InlineAddPanel
                title="New skill"
                fields={[
                  { key: 'name',     placeholder: 'Skill name *' },
                  { key: 'category', placeholder: 'Category (optional)' },
                ]}
                error={skillAddError} saving={skillAdding}
                onSave={handleAddSkill}
                onCancel={() => { setShowSkillForm(false); setSkillAddError(''); }}
              />
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2 mt-2 border-t border-[#F2F4F7]">
            <button type="button" onClick={handleSave} disabled={saving}
              className="inline-flex items-center gap-2 bg-[#7F56D9] hover:bg-[#6941C6] disabled:opacity-50 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors shadow-sm">
              <Save01 width={16} height={16} />
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            <button type="button" onClick={onClose}
              className="inline-flex items-center gap-2 bg-white hover:bg-gray-50 border border-[#D5D7DA] text-[#414651] text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors shadow-sm">
              Cancel
            </button>
          </div>

        </div>
      )}
    </SlideOver>
  );
}
