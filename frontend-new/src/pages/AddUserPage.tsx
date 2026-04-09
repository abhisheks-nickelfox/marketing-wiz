import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp, Save01 } from '@untitled-ui/icons-react';

// ── Types ─────────────────────────────────────────────────────────────────────

type Role = 'Admin' | 'Project Manager' | 'Member';
type CoreArea =
  | 'Marketing'
  | 'Account Management'
  | 'Project management'
  | 'UX Design'
  | 'Content'
  | 'Graphic design';

const ROLES: Role[] = ['Admin', 'Project Manager', 'Member'];
const CORE_AREAS_LEFT: CoreArea[]  = ['Marketing', 'Project management', 'Content'];
const CORE_AREAS_RIGHT: CoreArea[] = ['Account Management', 'UX Design', 'Graphic design'];

// ── InlineMultiSelect ─────────────────────────────────────────────────────────
// Renders the checkbox list inline (not absolutely positioned) so it pushes
// sibling elements down instead of overlapping them.

interface InlineMultiSelectProps<T extends string> {
  label: string;
  placeholder: string;
  selected: Set<T>;
  onToggle: (val: T) => void;
  singleColumn?: T[];
  leftColumn?: T[];
  rightColumn?: T[];
}

function InlineMultiSelect<T extends string>({
  label,
  placeholder,
  selected,
  onToggle,
  singleColumn,
  leftColumn,
  rightColumn,
}: InlineMultiSelectProps<T>) {
  const [open, setOpen] = useState(false);

  const displayLabel =
    selected.size === 0 ? placeholder : [...selected].join(', ');

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-[#414651]">{label}</label>

      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 bg-white border border-[#D5D7DA] rounded-lg px-3 py-2.5 shadow-sm text-left"
      >
        <span className={`flex-1 text-base leading-6 truncate ${selected.size === 0 ? 'text-[#717680]' : 'text-[#181D27]'}`}>
          {displayLabel}
        </span>
        {open
          ? <ChevronUp   width={16} height={16} className="text-[#717680] shrink-0" />
          : <ChevronDown width={16} height={16} className="text-[#717680] shrink-0" />
        }
      </button>

      {/* Inline panel — part of normal flow, so siblings push down */}
      {open && (
        <div className="bg-white border border-[#D5D7DA] rounded-lg shadow-sm overflow-hidden">
          {singleColumn ? (
            <div className="flex flex-col gap-4 p-4">
              {singleColumn.map((opt) => (
                <label key={opt} className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={selected.has(opt)}
                    onChange={() => onToggle(opt)}
                    className="w-4 h-4 rounded border-[#D5D7DA] accent-[#7F56D9] cursor-pointer"
                  />
                  <span className="text-base text-[#717680]">{opt}</span>
                </label>
              ))}
            </div>
          ) : leftColumn && rightColumn ? (
            <div className="grid grid-cols-2 p-4 gap-y-4">
              {/* Left col */}
              <div className="flex flex-col gap-4">
                {leftColumn.map((opt) => (
                  <label key={opt} className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={selected.has(opt)}
                      onChange={() => onToggle(opt)}
                      className="w-4 h-4 rounded border-[#D5D7DA] accent-[#7F56D9] cursor-pointer"
                    />
                    <span className="text-base text-[#717680]">{opt}</span>
                  </label>
                ))}
              </div>
              {/* Right col */}
              <div className="flex flex-col gap-4">
                {rightColumn.map((opt) => (
                  <label key={opt} className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={selected.has(opt)}
                      onChange={() => onToggle(opt)}
                      className="w-4 h-4 rounded border-[#D5D7DA] accent-[#7F56D9] cursor-pointer"
                    />
                    <span className="text-base text-[#717680]">{opt}</span>
                  </label>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

// ── AddUserPage ───────────────────────────────────────────────────────────────

export default function AddUserPage() {
  const navigate = useNavigate();
  const [name,      setName]      = useState('');
  const [email,     setEmail]     = useState('');
  const [roles,     setRoles]     = useState<Set<Role>>(new Set());
  const [coreAreas, setCoreAreas] = useState<Set<CoreArea>>(new Set());

  function toggleRole(r: Role) {
    setRoles((prev) => {
      const next = new Set(prev);
      if (next.has(r)) { next.delete(r); } else { next.add(r); }
      return next;
    });
  }

  function toggleCoreArea(a: CoreArea) {
    setCoreAreas((prev) => {
      const next = new Set(prev);
      if (next.has(a)) { next.delete(a); } else { next.add(a); }
      return next;
    });
  }

  function handleSave() {
    navigate('/users', { state: { showToast: true } });
  }

  return (
    <main className="flex-1 min-w-0 overflow-y-auto bg-gray-50 p-8">
      <div className="max-w-2xl">

        {/* Title */}
        <h1 className="text-2xl font-semibold text-[#181D27] mb-8">Add a new user</h1>

        <div className="flex flex-col gap-6">

          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[#414651]">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Team member"
              className="w-full bg-white border border-[#D5D7DA] rounded-lg px-3 py-2.5 text-base text-[#181D27] placeholder-[#717680] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#9E77ED] focus:border-transparent"
            />
          </div>

          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[#414651]">Email address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="1234@aiwealth.com"
              className="w-full bg-white border border-[#D5D7DA] rounded-lg px-3 py-2.5 text-base text-[#181D27] placeholder-[#717680] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#9E77ED] focus:border-transparent"
            />
          </div>

          {/* Role — single-column inline */}
          <InlineMultiSelect<Role>
            label="Role"
            placeholder="Select role(s)"
            selected={roles}
            onToggle={toggleRole}
            singleColumn={ROLES}
          />

          {/* Role hint */}
          <p className="text-base text-[#535862] -mt-2">
            Assign roles to define this user's permissions and responsibilities. You can update access at any time.
          </p>

          {/* Core Areas — two-column inline */}
          <InlineMultiSelect<CoreArea>
            label="Core Areas (Visible to you only )"
            placeholder="Select role(s)"
            selected={coreAreas}
            onToggle={toggleCoreArea}
            leftColumn={CORE_AREAS_LEFT}
            rightColumn={CORE_AREAS_RIGHT}
          />

        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 mt-8">
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-2 bg-[#7F56D9] hover:bg-[#6941C6] text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors shadow-sm"
          >
            <Save01 width={18} height={18} />
            Save
          </button>
          <button
            type="button"
            onClick={() => navigate('/users')}
            className="inline-flex items-center gap-2 bg-[#7F56D9] hover:bg-[#6941C6] text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors shadow-sm"
          >
            Cancel
          </button>
        </div>

      </div>
    </main>
  );
}
