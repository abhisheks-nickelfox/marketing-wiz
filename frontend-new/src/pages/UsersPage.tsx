import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Trash01,
  Edit01,
  DotsVertical,
  ArrowLeft,
  ArrowRight,
  UserPlus01,
} from '@untitled-ui/icons-react';
import Toast from '../components/ui/Toast';

// ── Types ─────────────────────────────────────────────────────────────────────

type UserStatus = 'Active' | 'invited' | 'Disabled';

interface TeamMember {
  id: string;
  name: string;
  handle: string;
  avatarBg: string;
  avatarInitials?: string;
  status: UserStatus;
  role: string;
  email: string;
  skills: string[];
}

// ── Static data ───────────────────────────────────────────────────────────────

const MEMBERS: TeamMember[] = [
  {
    id: '1',
    name: 'Olivia Rhye',
    handle: '@olivia',
    avatarBg: '#CFCBDC',
    status: 'Active',
    role: 'Product Designer',
    email: 'olivia@aiwealth.com',
    skills: ['Design', 'Product', 'Marketing'],
  },
  {
    id: '2',
    name: 'Phoenix Baker',
    handle: '@phoenix',
    avatarBg: '#D6CFB7',
    status: 'invited',
    role: 'Product Manager',
    email: 'phoenix@aiwealth.com',
    skills: ['Design', 'Product', 'Marketing'],
  },
  {
    id: '3',
    name: 'Lana Steiner',
    handle: '@lana',
    avatarBg: '#D7E3E8',
    status: 'Disabled',
    role: 'Frontend Developer',
    email: 'lana@aiwealth.com',
    skills: ['Design', 'Product', 'Marketing'],
  },
  {
    id: '4',
    name: 'Demi Wilkinson',
    handle: '@demi',
    avatarBg: '#DADCD6',
    status: 'Active',
    role: 'Backend Developer',
    email: 'demi@aiwealth.com',
    skills: ['Design', 'Product', 'Marketing'],
  },
  {
    id: '5',
    name: 'Candice Wu',
    handle: '@candice',
    avatarBg: '#CFCBDC',
    avatarInitials: 'CW',
    status: 'Active',
    role: 'Fullstack Developer',
    email: 'candice@aiwealth.com',
    skills: ['Design', 'Product', 'Marketing'],
  },
  {
    id: '6',
    name: 'Natali Craig',
    handle: '@natali',
    avatarBg: '#E9DCBB',
    status: 'Active',
    role: 'UX Designer',
    email: 'natali@aiwealth.com',
    skills: ['Design', 'Product', 'Marketing'],
  },
];

const SKILL_COLORS: Record<string, string> = {
  Design:    'bg-[#F9F5FF] border-[#E9D7FE] text-[#6941C6]',
  Product:   'bg-[#EFF8FF] border-[#B2DDFF] text-[#175CD3]',
  Marketing: 'bg-[#EEF4FF] border-[#C7D7FE] text-[#3538CD]',
};

// ── Sub-components ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: UserStatus }) {
  if (status === 'Active') {
    return (
      <span className="inline-flex items-center gap-1 bg-[#ECFDF3] border border-[#ABEFC6] text-[#067647] text-xs font-medium px-2 py-0.5 rounded-full">
        Active
        <span className="text-[#ABEFC6]">→</span>
      </span>
    );
  }
  if (status === 'invited') {
    return (
      <span className="bg-[#FFFAEB] border border-[#FEDF89] text-[#B54708] text-xs font-medium px-2 py-0.5 rounded-full">
        invited
      </span>
    );
  }
  return (
    <span className="bg-[#FAFAFA] border border-[#E9EAEB] text-[#414651] text-xs font-medium px-1.5 py-0.5 rounded-md">
      Disabled
    </span>
  );
}

function Avatar({ member }: { member: TeamMember }) {
  return (
    <div
      className="w-10 h-10 rounded-full shrink-0 border border-[rgba(0,0,0,0.08)] flex items-center justify-center overflow-hidden"
      style={{ backgroundColor: member.avatarBg }}
    >
      {member.avatarInitials ? (
        <span className="text-[#717680] text-sm font-semibold">{member.avatarInitials}</span>
      ) : null}
    </div>
  );
}

function SkillBadge({ label }: { label: string }) {
  const cls = SKILL_COLORS[label] ?? 'bg-[#FAFAFA] border-[#E9EAEB] text-[#414651]';
  return (
    <span className={`inline-flex items-center border text-xs font-medium px-2 py-0.5 rounded-full ${cls}`}>
      {label}
    </span>
  );
}

// ── UsersPage ─────────────────────────────────────────────────────────────────

interface UsersPageProps {
  showToast?: boolean;
}

export default function UsersPage({ showToast: initialToast = false }: UsersPageProps) {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [showToast, setShowToast] = useState(initialToast);

  const totalPages = 10;
  const isAllSelected = selected.size === MEMBERS.length;

  function toggleAll() {
    if (isAllSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(MEMBERS.map((m) => m.id)));
    }
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <main className="flex-1 min-w-0 overflow-y-auto bg-gray-50 p-8">

      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#181D27]">Team</h1>
          <p className="text-sm text-[#535862] mt-1">Manage your team members and their account permissions here.</p>
        </div>
        <button
          onClick={() => navigate('/users/new')}
          className="inline-flex items-center gap-2 bg-[#7F56D9] hover:bg-[#6941C6] text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
        >
          <UserPlus01 width={18} height={18} />
          Invite Team
        </button>
      </div>

      {/* Table card */}
      <div className="bg-white border border-[#E9EAEB] rounded-xl shadow-sm overflow-hidden">

        {/* Card header */}
        <div className="flex items-center gap-4 px-6 pt-5 pb-0">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-[#181D27]">Team members</h2>
              <span className="bg-[#F9F5FF] border border-[#E9D7FE] text-[#6941C6] text-xs font-medium px-2 py-0.5 rounded-full">
                100 users
              </span>
            </div>
          </div>
          <button className="text-[#717680] hover:text-[#414651] p-1">
            <DotsVertical width={20} height={20} />
          </button>
        </div>

        <div className="border-b border-[#E9EAEB] mt-5" />

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="bg-white border-b border-[#E9EAEB]">
                <th className="px-6 py-3 text-left w-[280px]">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={toggleAll}
                      className="w-4 h-4 rounded border-[#D5D7DA] accent-[#7F56D9] cursor-pointer"
                    />
                    <span className="text-xs font-semibold text-[#717680]">Name</span>
                  </div>
                </th>
                <th className="px-6 py-3 text-left w-[120px]">
                  <span className="text-xs font-semibold text-[#717680]">Status</span>
                </th>
                <th className="px-6 py-3 text-left w-[176px]">
                  <span className="text-xs font-semibold text-[#717680]">Role</span>
                </th>
                <th className="px-6 py-3 text-left w-[224px]">
                  <span className="text-xs font-semibold text-[#717680]">Email address</span>
                </th>
                <th className="px-6 py-3 text-left">
                  <span className="text-xs font-semibold text-[#717680]">Skills</span>
                </th>
                <th className="px-6 py-3 w-[90px]" />
              </tr>
            </thead>
            <tbody>
              {MEMBERS.map((member, idx) => {
                const isEven = idx % 2 === 0;
                const isChecked = selected.has(member.id);
                return (
                  <tr
                    key={member.id}
                    className={`border-b border-[#E9EAEB] ${isEven ? 'bg-[#FDFDFD]' : 'bg-white'}`}
                  >
                    {/* Name */}
                    <td className="px-6 py-4 h-[72px]">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleOne(member.id)}
                          className="w-4 h-4 rounded border-[#D5D7DA] accent-[#7F56D9] cursor-pointer shrink-0"
                        />
                        <div className="flex items-center gap-3">
                          <Avatar member={member} />
                          <div>
                            <p className="text-sm font-medium text-[#181D27] whitespace-nowrap">{member.name}</p>
                            <p className="text-sm text-[#535862] whitespace-nowrap">{member.handle}</p>
                          </div>
                        </div>
                      </div>
                    </td>
                    {/* Status */}
                    <td className="px-6 py-4">
                      <StatusBadge status={member.status} />
                    </td>
                    {/* Role */}
                    <td className="px-6 py-4">
                      <p className="text-sm text-[#535862] whitespace-nowrap">{member.role}</p>
                    </td>
                    {/* Email */}
                    <td className="px-6 py-4">
                      <p className="text-sm text-[#535862] whitespace-nowrap">{member.email}</p>
                    </td>
                    {/* Skills */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 flex-wrap">
                        {member.skills.map((skill) => (
                          <SkillBadge key={skill} label={skill} />
                        ))}
                        <span className="bg-[#FAFAFA] border border-[#E9EAEB] text-[#414651] text-xs font-medium px-2 py-0.5 rounded-full">
                          +4
                        </span>
                      </div>
                    </td>
                    {/* Actions */}
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-0.5">
                        <button className="p-1.5 rounded-lg hover:bg-gray-100 text-[#717680] hover:text-[#414651] transition-colors">
                          <Trash01 width={16} height={16} />
                        </button>
                        <button className="p-1.5 rounded-lg hover:bg-gray-100 text-[#717680] hover:text-[#414651] transition-colors">
                          <Edit01 width={16} height={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-6 pt-3 pb-4 border-t border-[#E9EAEB]">
          {/* Previous */}
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="inline-flex items-center gap-1.5 bg-white border border-[#E9EAEB] text-sm font-semibold text-[#414651] px-3 py-2 rounded-lg shadow-sm hover:bg-gray-50 disabled:text-[#A4A7AE] disabled:cursor-not-allowed transition-colors"
          >
            <ArrowLeft width={18} height={18} />
            Previous
          </button>

          {/* Page numbers */}
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, '...', 8, 9, 10].map((page, i) => (
              <button
                key={i}
                onClick={() => typeof page === 'number' && setCurrentPage(page)}
                disabled={page === '...'}
                className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors
                  ${page === currentPage
                    ? 'bg-[#FAFAFA] text-[#414651]'
                    : page === '...'
                    ? 'text-[#717680] cursor-default'
                    : 'text-[#717680] hover:bg-gray-50'}
                `}
              >
                {page}
              </button>
            ))}
          </div>

          {/* Next */}
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="inline-flex items-center gap-1.5 bg-white border border-[#D5D7DA] text-sm font-semibold text-[#414651] px-3 py-2 rounded-lg shadow-sm hover:bg-gray-50 disabled:text-[#A4A7AE] disabled:cursor-not-allowed transition-colors"
          >
            Next
            <ArrowRight width={18} height={18} />
          </button>
        </div>
      </div>

      {/* Success toast */}
      {showToast && (
        <Toast
          message="Invitation has been sent successfully"
          subtitle="The team member will receive an invite email shortly."
          onClose={() => setShowToast(false)}
        />
      )}
    </main>
  );
}
