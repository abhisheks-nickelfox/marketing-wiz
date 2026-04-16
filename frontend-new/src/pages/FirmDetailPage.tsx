import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronRight,
  ChevronDown,
  FolderClosed,
  Plus,
  FilterLines,
  SearchLg,
} from '@untitled-ui/icons-react';

import { firmsApi, tasksApi, usersApi, type Firm, type Task, type User } from '../lib/api';
import AvatarStack from '../components/ui/AvatarStack';
import { PriorityBadge, TaskStatusBadge } from '../components/tasks/TaskBadges';

// ── Types ─────────────────────────────────────────────────────────────────────

type TabId =
  | 'overview'
  | 'client-requests'
  | 'projects'
  | 'hubspot'
  | 'lead-pipeline'
  | 'client-assets'
  | 'time-reports'
  | 'meetings'
  | 'notes-sops'
  | 'activities';

interface TabDef {
  id: TabId;
  label: string;
}

// ── Status group definitions ──────────────────────────────────────────────────

interface StatusGroup {
  id: string;
  label: string;
  statuses: string[];
}

const STATUS_GROUPS: StatusGroup[] = [
  { id: 'todo',        label: 'ToDo',       statuses: ['draft'] },
  { id: 'inprogress',  label: 'In progress', statuses: ['in_progress', 'revisions'] },
  { id: 'inreview',    label: 'In Review',  statuses: ['internal_review', 'client_review', 'compliance_review'] },
  { id: 'approved',    label: 'Approved',   statuses: ['approved'] },
  { id: 'completed',   label: 'Completed',  statuses: ['closed'] },
];

const TABS: TabDef[] = [
  { id: 'overview',        label: 'Overview' },
  { id: 'client-requests', label: 'Client Requests' },
  { id: 'projects',        label: 'Projects' },
  { id: 'hubspot',         label: 'HubSpot' },
  { id: 'lead-pipeline',   label: 'Lead & Pipeline Mgt' },
  { id: 'client-assets',   label: 'Client Assets' },
  { id: 'time-reports',    label: 'Time Reports' },
  { id: 'meetings',        label: 'Meetings' },
  { id: 'notes-sops',      label: 'Notes & SOPs' },
  { id: 'activities',      label: 'Activities' },
];

// ── Status dot SVG ────────────────────────────────────────────────────────────

function StatusDot({ status }: { status: string }) {
  if (status === 'draft') {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle cx="8" cy="8" r="6" stroke="#A4A7AE" strokeWidth="1.5" fill="none" />
      </svg>
    );
  }
  if (status === 'in_progress' || status === 'revisions') {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle cx="8" cy="8" r="6" fill="#7F56D9" />
      </svg>
    );
  }
  if (status === 'approved' || status === 'closed') {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle cx="8" cy="8" r="6" fill="#17B26A" />
      </svg>
    );
  }
  // internal_review, client_review, compliance_review
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6" fill="#F79009" />
    </svg>
  );
}

// ── Status group dot (for group headers — representative of the group) ────────

function GroupStatusDot({ groupId }: { groupId: string }) {
  const representativeStatus: Record<string, string> = {
    todo:       'draft',
    inprogress: 'in_progress',
    inreview:   'internal_review',
    approved:   'approved',
    completed:  'closed',
  };
  return <StatusDot status={representativeStatus[groupId] ?? 'draft'} />;
}

// ── Due date label ─────────────────────────────────────────────────────────────

function dueDateLabel(deadline: string | null): string {
  if (!deadline) return '—';
  const d = new Date(deadline);
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays > 0 && diffDays < 7) return `In ${diffDays} days`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ── Task row ──────────────────────────────────────────────────────────────────

interface TaskRowProps {
  task: Task;
  firm: Firm | null;
  usersMap: Map<string, User>;
  indented?: boolean;
}

function TaskRow({ task, firm, usersMap, indented = false }: TaskRowProps) {
  const assignee = task.assignee_id ? usersMap.get(task.assignee_id) : null;

  const avatars = assignee
    ? [{ name: assignee.name, src: assignee.avatar_url ?? undefined }]
    : [];

  return (
    <div
      className={`grid grid-cols-[1fr_160px_120px_100px_120px] items-center border-b border-[#E9EAEB] hover:bg-[#F9FAFB] transition-colors ${indented ? 'pl-8' : ''}`}
      role="row"
    >
      {/* Column 1: Task title */}
      <div className="flex items-center gap-2 px-4 py-2.5 min-w-0">
        <span className="text-[#A4A7AE] shrink-0">
          <StatusDot status={task.status} />
        </span>
        <FolderClosed
          width={15}
          height={15}
          className="text-[#A4A7AE] shrink-0"
          aria-hidden="true"
        />
        <span className="text-[13px] text-[#181D27] truncate leading-snug">
          {task.title}
          {firm && (
            <span className="text-[#A4A7AE] font-normal ml-1">
              For {firm.name}
            </span>
          )}
        </span>
      </div>

      {/* Column 2: Assignee */}
      <div className="flex items-center px-3 py-2.5">
        <AvatarStack avatars={avatars} max={3} showAddButton={true} />
      </div>

      {/* Column 3: Due date */}
      <div className="px-3 py-2.5">
        <span className="text-[13px] text-[#414651]">
          {dueDateLabel(task.deadline)}
        </span>
      </div>

      {/* Column 4: Priority */}
      <div className="px-3 py-2.5">
        <PriorityBadge priority={task.priority} />
      </div>

      {/* Column 5: Status */}
      <div className="px-3 py-2.5">
        <TaskStatusBadge status={task.status} />
      </div>
    </div>
  );
}

// ── Project group row (expandable) ────────────────────────────────────────────

interface ProjectGroupRowProps {
  projectId: string | null;
  tasks: Task[];
  firm: Firm | null;
  usersMap: Map<string, User>;
}

function ProjectGroupRow({ projectId, tasks, firm, usersMap }: ProjectGroupRowProps) {
  const [expanded, setExpanded] = useState(true);
  const label = projectId ?? 'No Project';

  // Collect all unique assignees across tasks in this project
  const allAvatars = useMemo(() => {
    const seen = new Set<string>();
    const result: { name: string; src?: string }[] = [];
    for (const task of tasks) {
      if (task.assignee_id && !seen.has(task.assignee_id)) {
        seen.add(task.assignee_id);
        const u = usersMap.get(task.assignee_id);
        if (u) result.push({ name: u.name, src: u.avatar_url ?? undefined });
      }
    }
    return result;
  }, [tasks, usersMap]);

  // Representative status is taken from the first task
  const repStatus = tasks[0]?.status ?? 'draft';

  return (
    <>
      {/* Project header row */}
      <div
        className="grid grid-cols-[1fr_160px_120px_100px_120px] items-center border-b border-[#E9EAEB] bg-[#F9FAFB] hover:bg-[#F2F4F7] transition-colors cursor-pointer"
        role="row"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2 px-4 py-2.5 min-w-0">
          <span className="shrink-0 text-[#717680] transition-transform duration-150">
            {expanded ? (
              <ChevronDown width={14} height={14} aria-hidden="true" />
            ) : (
              <ChevronRight width={14} height={14} aria-hidden="true" />
            )}
          </span>
          <span className="text-[#A4A7AE] shrink-0">
            <StatusDot status={repStatus} />
          </span>
          <FolderClosed
            width={15}
            height={15}
            className="text-[#7F56D9] shrink-0"
            aria-hidden="true"
          />
          <span className="text-[13px] font-semibold text-[#181D27] truncate">
            {label}
          </span>
          {firm && (
            <span className="text-[13px] text-[#A4A7AE] font-normal ml-1 truncate">
              For {firm.name}
            </span>
          )}
        </div>

        <div className="flex items-center px-3 py-2.5">
          <AvatarStack avatars={allAvatars} max={3} showAddButton={true} />
        </div>

        <div className="px-3 py-2.5" />
        <div className="px-3 py-2.5" />
        <div className="px-3 py-2.5" />
      </div>

      {/* Sub-tasks */}
      {expanded &&
        tasks.map((task) => (
          <TaskRow
            key={task.id}
            task={task}
            firm={firm}
            usersMap={usersMap}
            indented
          />
        ))}
    </>
  );
}

// ── Status section ────────────────────────────────────────────────────────────

interface StatusSectionProps {
  group: StatusGroup;
  tasks: Task[];
  firm: Firm | null;
  usersMap: Map<string, User>;
  groupedByProject: boolean;
}

function StatusSection({ group, tasks, firm, usersMap, groupedByProject }: StatusSectionProps) {
  const [collapsed, setCollapsed] = useState(false);

  // Group tasks by project_id
  const byProject = useMemo<Map<string | null, Task[]>>(() => {
    const map = new Map<string | null, Task[]>();
    for (const task of tasks) {
      const key = task.project_id ?? null;
      const arr = map.get(key);
      if (arr) arr.push(task);
      else map.set(key, [task]);
    }
    return map;
  }, [tasks]);

  return (
    <section aria-label={group.label}>
      {/* Section header */}
      <div className="flex items-center gap-2 px-4 py-2 bg-[#F2F4F7] border-b border-[#E9EAEB]">
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="flex items-center gap-2 flex-1 text-left"
          aria-expanded={!collapsed}
          aria-controls={`section-body-${group.id}`}
        >
          <span className="shrink-0 text-[#717680]">
            {collapsed ? (
              <ChevronRight width={14} height={14} aria-hidden="true" />
            ) : (
              <ChevronDown width={14} height={14} aria-hidden="true" />
            )}
          </span>
          <GroupStatusDot groupId={group.id} />
          <span className="text-[12px] font-bold text-[#181D27] uppercase tracking-wide">
            {group.label}
          </span>
          <span className="text-[12px] text-[#717680] font-normal">{tasks.length}</span>
        </button>
        <button
          className="w-6 h-6 rounded flex items-center justify-center text-[#717680] hover:bg-[#E9EAEB] transition-colors"
          aria-label={`Add task to ${group.label}`}
        >
          <Plus width={14} height={14} aria-hidden="true" />
        </button>
      </div>

      {/* Section body */}
      {!collapsed && (
        <div id={`section-body-${group.id}`}>
          {tasks.length === 0 ? (
            <p className="text-[13px] text-[#A4A7AE] px-4 py-3">No tasks</p>
          ) : groupedByProject ? (
            Array.from(byProject.entries()).map(([projectId, projectTasks]) => (
              <ProjectGroupRow
                key={projectId ?? '__none__'}
                projectId={projectId}
                tasks={projectTasks}
                firm={firm}
                usersMap={usersMap}
              />
            ))
          ) : (
            tasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                firm={firm}
                usersMap={usersMap}
              />
            ))
          )}

          {/* Add task row */}
          <button className="flex items-center gap-2 px-4 py-2 w-full text-left text-[13px] text-[#717680] hover:bg-[#F9FAFB] transition-colors border-b border-[#E9EAEB]">
            <Plus width={14} height={14} className="text-[#A4A7AE]" aria-hidden="true" />
            Add Task
          </button>
        </div>
      )}
    </section>
  );
}

// ── Projects tab content ──────────────────────────────────────────────────────

interface ProjectsTabProps {
  firm: Firm | null;
  tasks: Task[];
  users: User[];
}

function ProjectsTab({ firm, tasks, users }: ProjectsTabProps) {
  const [search, setSearch] = useState('');
  const [groupedByProject, setGroupedByProject] = useState(true);

  const usersMap = useMemo(() => {
    const m = new Map<string, User>();
    for (const u of users) m.set(u.id, u);
    return m;
  }, [users]);

  // Filter tasks by search query
  const filteredTasks = useMemo(() => {
    if (!search.trim()) return tasks;
    const q = search.toLowerCase();
    return tasks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.description ?? '').toLowerCase().includes(q),
    );
  }, [tasks, search]);

  // Group by status
  const tasksByGroup = useMemo(() => {
    const result = new Map<string, Task[]>();
    for (const g of STATUS_GROUPS) result.set(g.id, []);

    for (const task of filteredTasks) {
      for (const g of STATUS_GROUPS) {
        if (g.statuses.includes(task.status)) {
          result.get(g.id)?.push(task);
          break;
        }
      }
    }
    return result;
  }, [filteredTasks]);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-[#E9EAEB] bg-white shrink-0 flex-wrap">
        {/* Search */}
        <div className="flex items-center gap-2 border border-[#E9EAEB] rounded-lg px-3 py-1.5 bg-white text-sm w-56">
          <SearchLg width={16} height={16} className="text-[#A4A7AE] shrink-0" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search"
            aria-label="Search tasks"
            className="flex-1 text-[13px] text-[#181D27] placeholder:text-[#A4A7AE] bg-transparent outline-none"
          />
          <kbd className="border border-[#E9EAEB] rounded px-1.5 py-0.5 text-[11px] text-[#A4A7AE] font-medium leading-none shrink-0">
            ⌘K
          </kbd>
        </div>

        {/* Grouped by Project toggle */}
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <div
            role="checkbox"
            aria-checked={groupedByProject}
            tabIndex={0}
            onClick={() => setGroupedByProject((v) => !v)}
            onKeyDown={(e) => e.key === ' ' && setGroupedByProject((v) => !v)}
            className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
              groupedByProject
                ? 'bg-[#7F56D9] border-[#7F56D9]'
                : 'bg-white border-[#D0D5DD]'
            }`}
          >
            {groupedByProject && (
              <svg width="10" height="8" viewBox="0 0 10 8" fill="none" aria-hidden="true">
                <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
          <span className="text-[13px] text-[#414651]">Grouped by Project</span>
        </label>

        <div className="flex items-center gap-2 ml-auto">
          {/* Add Project */}
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#D0D5DD] bg-white text-[13px] font-semibold text-[#344054] hover:bg-[#F9FAFB] transition-colors"
            aria-label="Add project"
          >
            <Plus width={14} height={14} aria-hidden="true" />
            Add Project
          </button>

          {/* Add Task */}
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#7F56D9] text-[13px] font-semibold text-white hover:bg-[#6941C6] transition-colors"
            aria-label="Add task"
          >
            <Plus width={14} height={14} aria-hidden="true" />
            Add Task
          </button>

          {/* Filter */}
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#D0D5DD] bg-white text-[13px] font-semibold text-[#344054] hover:bg-[#F9FAFB] transition-colors"
            aria-label="Filter tasks"
          >
            <FilterLines width={14} height={14} aria-hidden="true" />
            Filter
          </button>
        </div>
      </div>

      {/* Table column headers */}
      <div className="grid grid-cols-[1fr_160px_120px_100px_120px] border-b border-[#E9EAEB] bg-[#F9FAFB] shrink-0">
        <div className="px-4 py-2 text-[11px] font-semibold text-[#717680] uppercase tracking-wide">
          Tasks / Projects
        </div>
        <div className="px-3 py-2 text-[11px] font-semibold text-[#717680] uppercase tracking-wide">
          Assignee
        </div>
        <div className="px-3 py-2 text-[11px] font-semibold text-[#717680] uppercase tracking-wide">
          Due date
        </div>
        <div className="px-3 py-2 text-[11px] font-semibold text-[#717680] uppercase tracking-wide">
          Priority
        </div>
        <div className="px-3 py-2 text-[11px] font-semibold text-[#717680] uppercase tracking-wide">
          Status
        </div>
      </div>

      {/* Scrollable sections body */}
      <div className="flex-1 overflow-y-auto">
        {STATUS_GROUPS.map((group) => {
          const groupTasks = tasksByGroup.get(group.id) ?? [];
          return (
            <StatusSection
              key={group.id}
              group={group}
              tasks={groupTasks}
              firm={firm}
              usersMap={usersMap}
              groupedByProject={groupedByProject}
            />
          );
        })}
      </div>
    </div>
  );
}

// ── Coming soon placeholder ───────────────────────────────────────────────────

function ComingSoon() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <p className="text-sm text-[#A4A7AE]">Coming soon</p>
    </div>
  );
}

// ── FirmDetailPage ────────────────────────────────────────────────────────────

export default function FirmDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<TabId>('projects');
  const [firm, setFirm] = useState<Firm | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);

    Promise.all([
      firmsApi.get(id),
      tasksApi.list({ firm_id: id }),
      usersApi.list(),
    ])
      .then(([firmData, tasksData, usersData]) => {
        setFirm(firmData);
        setTasks(tasksData);
        setUsers(usersData);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load firm data');
      })
      .finally(() => setLoading(false));
  }, [id]);

  // ── Loading state ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <main className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="flex flex-col flex-1 items-center justify-center">
          <div className="w-6 h-6 border-2 border-[#7F56D9] border-t-transparent rounded-full animate-spin" aria-label="Loading" />
          <p className="text-[13px] text-[#717680] mt-3">Loading firm details…</p>
        </div>
      </main>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────────

  if (error) {
    return (
      <main className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="flex flex-col flex-1 items-center justify-center gap-3">
          <p className="text-[13px] text-red-500">{error}</p>
          <button
            onClick={() => navigate(-1)}
            className="text-[13px] text-[#7F56D9] hover:underline"
          >
            Go back
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-col flex-1 min-h-0 overflow-hidden" role="main">

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <header className="shrink-0 px-6 pt-5 pb-0 bg-white border-b border-[#E9EAEB]">

        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 mb-2">
          <button
            onClick={() => navigate('/firms')}
            className="text-[13px] text-[#717680] hover:text-[#414651] transition-colors"
          >
            Firms
          </button>
          <ChevronRight width={14} height={14} className="text-[#A4A7AE]" aria-hidden="true" />
          <button
            onClick={() => setActiveTab('overview')}
            className="text-[13px] text-[#717680] hover:text-[#414651] transition-colors"
          >
            {firm?.name ?? '…'}
          </button>
          <ChevronRight width={14} height={14} className="text-[#A4A7AE]" aria-hidden="true" />
          <span className="text-[13px] text-[#181D27] font-medium" aria-current="page">
            {TABS.find((t) => t.id === activeTab)?.label ?? 'Projects'}
          </span>
        </nav>

        {/* Firm name title */}
        <h1 className="text-[22px] font-bold text-[#181D27] leading-tight mb-4">
          {firm?.name ?? '—'}
        </h1>

        {/* Tab bar */}
        <div
          className="flex items-end gap-0 overflow-x-auto"
          role="tablist"
          aria-label="Firm sections"
          style={{ scrollbarWidth: 'none' }}
        >
          {TABS.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`tabpanel-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`shrink-0 px-4 py-2 text-[13px] font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-[#7F56D9] text-[#7F56D9]'
                  : 'border-transparent text-[#717680] hover:text-[#414651] hover:border-[#D0D5DD]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* ── Tab panel ────────────────────────────────────────────────────── */}
      <div
        className="flex flex-col flex-1 min-h-0 overflow-hidden"
        role="tabpanel"
        id={`tabpanel-${activeTab}`}
        aria-labelledby={activeTab}
      >
        {activeTab === 'projects' ? (
          <ProjectsTab firm={firm} tasks={tasks} users={users} />
        ) : (
          <ComingSoon />
        )}
      </div>
    </main>
  );
}
