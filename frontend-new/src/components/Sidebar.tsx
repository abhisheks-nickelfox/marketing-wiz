import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Inbox01,
  LayoutGrid01,
  Building02,
  Folder,
  Clock,
  Zap,
  Users01,
  Settings01,
  SearchLg,
} from '@untitled-ui/icons-react';

import NavSection from './sidebar/NavSection';
import NavItem from './sidebar/NavItem';
import ExpandableNavItem from './sidebar/ExpandableNavItem';
import { firmsApi } from '../lib/api';

// ── My Tasks sub-items (from Figma / screenshot) ──────────────────────────────
const MY_TASKS = [
  { id: 'todo',          label: 'Todo',          badge: { count: 10, variant: 'blue'    as const } },
  { id: 'assigned-me',   label: 'Assigned to me',badge: { count: 10, variant: 'brand'   as const } },
  { id: 'today-due',     label: 'Today Due',     badge: { count: 10, variant: 'success' as const } },
  { id: 'overdue',       label: 'Overdue',       badge: { count: 10, variant: 'error'   as const } },
  { id: 'active',        label: 'Active' },
  { id: 'assigned',      label: 'Assigned' },
  { id: 'in-progress',   label: 'In Progress' },
  { id: 'urgent',        label: 'Urgent' },
  { id: 'blocked',       label: 'Blocked' },
  { id: 'revisions',     label: 'Revisions' },
  { id: 'closed',        label: 'Closed' },
  { id: 'complete',      label: 'Complete' },
];

// ── Sidebar ───────────────────────────────────────────────────────────────────

/** Maps the current pathname to a nav item ID for active highlighting. */
function getActiveNav(pathname: string): string {
  if (pathname === '/dashboard' || pathname === '/') return 'dashboard';
  if (pathname.startsWith('/users'))                 return 'users';
  if (pathname.startsWith('/inbox'))                 return 'inbox';
  if (pathname.startsWith('/timesheet'))             return 'timesheet';
  if (pathname.startsWith('/transcripts'))           return 'transcripts';
  if (pathname.startsWith('/settings'))              return 'settings';
  if (pathname.startsWith('/firms'))                 return 'firms';
  return '';
}

/** Extract the firm id from a /firms/:id pathname */
function getActiveFirmId(pathname: string): string {
  const match = pathname.match(/^\/firms\/([^/]+)/);
  return match ? match[1] : '';
}

export default function Sidebar() {
  const navigate   = useNavigate();
  const location   = useLocation();
  const activeNav  = getActiveNav(location.pathname);

  const [firmItems, setFirmItems] = useState<{ id: string; label: string }[]>([]);
  const [firmsLoading, setFirmsLoading] = useState(true);
  const [activeTask, setActiveTask] = useState('');

  // Derive active firm from URL
  const activeFirm = getActiveFirmId(location.pathname);

  // Fetch firms from API on mount
  useEffect(() => {
    firmsApi.list()
      .then((firms) => {
        setFirmItems(firms.map((f) => ({ id: f.id, label: f.name })));
      })
      .catch(() => {
        // Silently fall back to empty list — firms section will show nothing
      })
      .finally(() => {
        setFirmsLoading(false);
      });
  }, []);

  return (
    <aside className="w-64 shrink-0 bg-white border-r border-gray-200 flex flex-col h-screen sticky top-0 overflow-y-auto">

      {/* ── Logo ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2.5 px-5 pt-4 pb-2 shrink-0">
        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
          <svg width="20" height="22" viewBox="0 0 22 26" fill="none">
            <path d="M14 2L4 16h8l-2 10 12-16h-8l2-8z" fill="white" stroke="white" strokeWidth="0.5" strokeLinejoin="round"/>
          </svg>
        </div>
        <div>
          <p className="text-[15px] font-bold text-gray-900 leading-tight">AI Wealth</p>
          <p className="text-[11px] text-gray-500 leading-tight">Connections</p>
        </div>
      </div>

      {/* ── Search ───────────────────────────────────────────────────── */}
      <div className="px-3 pb-3 shrink-0">
        <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2 bg-white shadow-sm">
          <SearchLg width={16} height={16} className="text-gray-400 shrink-0" />
          <span className="flex-1 text-sm text-gray-400">Search</span>
          <span className="border border-gray-200 rounded px-1.5 py-0.5 text-[11px] text-gray-400 font-medium leading-none">
            ⌘K
          </span>
        </div>
      </div>

      {/* ── Navigation ───────────────────────────────────────────────── */}
      <nav className="flex-1 px-2 overflow-y-auto pb-4">

        {/* GENERAL */}
        <NavSection heading="GENERAL">
          <NavItem
            label="Inbox"
            icon={<Inbox01 width={20} height={20} />}
            active={activeNav === 'inbox'}
            onClick={() => navigate('/inbox')}
          />
          <div data-tour="tour-dashboard">
            <NavItem
              label="Dashboard"
              icon={<LayoutGrid01 width={20} height={20} />}
              active={activeNav === 'dashboard'}
              onClick={() => navigate('/dashboard')}
            />
          </div>
          {firmsLoading ? (
            <div className="ml-2 flex flex-col gap-1 py-1">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-7 bg-gray-100 rounded-md animate-pulse mx-1" />
              ))}
            </div>
          ) : (
            <div data-tour="tour-firms">
              <ExpandableNavItem
                label="Firms"
                icon={<Building02 width={20} height={20} />}
                items={firmItems}
                activeItemId={activeFirm}
                onItemClick={(id) => navigate(`/firms/${id}`)}
              />
            </div>
          )}
        </NavSection>

        {/* YOU */}
        <NavSection heading="YOU">
          <ExpandableNavItem
            label="My Tasks"
            icon={<Folder width={20} height={20} />}
            items={MY_TASKS}
            activeItemId={activeTask}
            onItemClick={setActiveTask}
          />
          <NavItem
            label="Timesheet"
            icon={<Clock width={20} height={20} />}
            active={activeNav === 'timesheet'}
            onClick={() => navigate('/timesheet')}
          />
        </NavSection>

        {/* AI HUB */}
        <NavSection heading="AI HUB">
          <div data-tour="tour-transcripts">
            <NavItem
              label="Transcripts Flow"
              icon={<Zap width={20} height={20} />}
              active={activeNav === 'transcripts'}
              onClick={() => navigate('/transcripts')}
            />
          </div>
        </NavSection>

        {/* PLATFORM */}
        <NavSection heading="PLATFORM">
          <div data-tour="tour-users">
            <NavItem
              label="Users"
              icon={<Users01 width={20} height={20} />}
              active={activeNav === 'users'}
              onClick={() => navigate('/users')}
            />
          </div>
          <NavItem
            label="Settings"
            icon={<Settings01 width={20} height={20} />}
            active={activeNav === 'settings'}
            onClick={() => navigate('/settings')}
          />
        </NavSection>

      </nav>
    </aside>
  );
}
