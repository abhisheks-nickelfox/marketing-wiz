import { useState, useEffect, useMemo } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import {
  X, Calendar, Clock, ChevronDown, ChevronRight,
  AlertCircle, CheckCircle, Tag01, UploadCloud01, ArrowLeft, Users01, Archive,
} from '@untitled-ui/icons-react';
import Avatar from '../components/ui/Avatar';
import { tasksApi, usersApi } from '../lib/api';
import type { Task, Transcript, User } from '../lib/api';
import { formatDate, formatDurationSec, formatDateInput } from '../lib/transcriptUtils';
import { PriorityBadge, TaskStatusBadge, TypeBadge } from '../components/tasks/TaskBadges';

// ── Tab helpers ───────────────────────────────────────────────────────────────

type TaskTab = 'all' | 'pending' | 'approved' | 'needs-review' | 'ignored' | 'archived';

function getTaskTab(task: Task): TaskTab {
  if (task.archived) return 'archived';
  if (task.status === 'draft') return 'needs-review';
  if (task.status === 'discarded') return 'ignored';
  if (['approved', 'closed'].includes(task.status)) return 'approved';
  return 'pending';
}

// ── Approval Confirm Modal ─────────────────────────────────────────────────────

interface ApprovalConfirmModalProps {
  open: boolean;
  task: Task | null;
  assigneeName: string;
  assigneeId: string;
  deadline: string;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}

function ApprovalConfirmModal({
  open, task, assigneeName, assigneeId, deadline, onCancel, onConfirm,
}: ApprovalConfirmModalProps) {
  const [confirming, setConfirming] = useState(false);

  async function handleConfirm() {
    setConfirming(true);
    try { await onConfirm(); } finally { setConfirming(false); }
  }

  if (!open || !task) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-start justify-between mb-4">
            <div className="w-10 h-10 rounded-full bg-[#ECFDF3] flex items-center justify-center">
              <CheckCircle width={20} height={20} className="text-[#17B26A]" />
            </div>
            <button onClick={onCancel} className="p-1 rounded text-[#717680] hover:bg-gray-100 transition-colors">
              <X width={18} height={18} />
            </button>
          </div>
          <h2 className="text-lg font-semibold text-[#181D27] mb-1">Approval Confirmation</h2>
          <p className="text-sm text-[#535862]">
            Once approved, the task will be assigned to{' '}
            <span className="font-medium text-[#181D27]">{assigneeName || 'the assignee'}</span>.
            Before please confirm.
          </p>
        </div>

        <div className="px-6 pb-5 flex flex-col gap-3">
          {assigneeId && (
            <div className="flex items-center gap-3 p-3 bg-[#F9FAFB] rounded-lg">
              <Avatar name={assigneeName} size="sm" />
              <div>
                <p className="text-xs text-[#717680]">Assignee</p>
                <p className="text-sm font-medium text-[#181D27]">{assigneeName}</p>
              </div>
            </div>
          )}
          <div className="flex items-center gap-3 p-3 bg-[#F9FAFB] rounded-lg">
            <div className="w-8 h-8 rounded-full bg-[#EFF8FF] flex items-center justify-center">
              <Tag01 width={14} height={14} className="text-[#1565C0]" />
            </div>
            <div>
              <p className="text-xs text-[#717680]">Task Type</p>
              <p className="text-sm font-medium text-[#181D27] capitalize">{task.type?.replace(/_/g, ' ') || 'General'}</p>
            </div>
          </div>
          {deadline && (
            <div className="flex items-center gap-3 p-3 bg-[#F9FAFB] rounded-lg">
              <div className="w-8 h-8 rounded-full bg-[#F4F3FF] flex items-center justify-center">
                <Calendar width={14} height={14} className="text-[#5925DC]" />
              </div>
              <div>
                <p className="text-xs text-[#717680]">Due Date</p>
                <p className="text-sm font-medium text-[#181D27]">{formatDate(deadline)}</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 px-6 py-4 border-t border-[#E9EAEB]">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 text-sm font-semibold text-[#414651] border border-[#D5D7DA] rounded-lg bg-white hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={confirming}
            className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-[#7F56D9] hover:bg-[#6941C6] disabled:opacity-60 rounded-lg transition-colors"
          >
            {confirming ? 'Approving…' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Task Detail Panel ──────────────────────────────────────────────────────────

interface TaskDetailPanelProps {
  task: Task | null;
  open: boolean;
  onClose: () => void;
  users: User[];
  onSaved: (updated: Task) => void;
  onIgnored: (id: string) => void;
  onApproved: (updated: Task) => void;
  onArchived: (updated: Task) => void;
}

function TaskDetailPanel({ task, open, onClose, users, onSaved, onIgnored, onApproved, onArchived }: TaskDetailPanelProps) {
  const [sourceTab, setSourceTab] = useState<'quote' | 'transcript' | 'video'>('quote');
  const [sourceOpen, setSourceOpen] = useState(true);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Task['priority']>('normal');
  const [deadline, setDeadline] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [assigneePickerOpen, setAssigneePickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [ignoring, setIgnoring] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (task && open) {
      setTitle(task.title);
      setDescription(task.description ?? '');
      setPriority(task.priority);
      setDeadline(formatDateInput(task.deadline));
      setAssigneeId(task.assignee_id ?? '');
      setError('');
      setShowConfirm(false);
    }
  }, [task, open]);

  const selectedAssignee = users.find((u) => u.id === assigneeId) ?? null;

  async function handleSave() {
    if (!task) return;
    setSaving(true);
    setError('');
    try {
      const updated = await tasksApi.update(task.id, { title, description, priority, deadline: deadline || null });
      onSaved(updated);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  }

  async function handleIgnore() {
    if (!task) return;
    setIgnoring(true);
    setError('');
    try {
      await tasksApi.discard(task.id);
      onIgnored(task.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to ignore task.');
    } finally {
      setIgnoring(false);
    }
  }

  async function handleArchive() {
    if (!task) return;
    setArchiving(true);
    setError('');
    try {
      const updated = await tasksApi.archive(task.id, !task.archived);
      onArchived(updated);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to archive task.');
    } finally {
      setArchiving(false);
    }
  }

  async function handleConfirmApprove() {
    if (!task || !assigneeId) return;
    const updated = await tasksApi.assignApprove(task.id, {
      assignee_id: assigneeId,
      priority,
      deadline: deadline || undefined,
    });
    setShowConfirm(false);
    onApproved(updated);
  }

  const excerptText = task?.description?.slice(0, 300) ?? 'No transcript excerpt available.';

  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/20 transition-opacity duration-200 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      />
      <div
        className={`fixed inset-y-0 right-0 z-50 flex flex-col bg-white border-l border-[#E9EAEB] shadow-xl transition-transform duration-300 ease-in-out w-[560px] ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-[#E9EAEB] shrink-0">
          <div className="flex-1 min-w-0 pr-4">
            <p className="text-sm font-semibold text-[#181D27] truncate mb-1">{task?.title ?? ''}</p>
            {task && <TaskStatusBadge status={task.status} />}
          </div>
          <button onClick={onClose} className="p-1 rounded text-[#717680] hover:text-[#414651] hover:bg-gray-100 transition-colors shrink-0">
            <X width={18} height={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">
          {task?.firms?.name && <p className="text-sm text-[#535862]">{task.firms.name}</p>}

          {/* Source Quote */}
          <div className="border border-[#E9EAEB] rounded-xl overflow-hidden">
            <button
              onClick={() => setSourceOpen((v) => !v)}
              className="flex items-center justify-between w-full px-4 py-3 text-sm font-semibold text-[#181D27] hover:bg-[#FAFAFA] transition-colors"
            >
              <span>Source Quote</span>
              <ChevronDown width={16} height={16} className={`text-[#A4A7AE] transition-transform ${sourceOpen ? 'rotate-180' : ''}`} />
            </button>
            {sourceOpen && (
              <>
                <div className="flex border-t border-b border-[#E9EAEB] bg-[#F9FAFB]">
                  {([['quote', 'Source Quote'], ['transcript', 'Full meeting Transcript'], ['video', 'Video']] as const).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => setSourceTab(key)}
                      className={`flex-1 px-3 py-2.5 text-xs font-medium transition-colors ${sourceTab === key ? 'text-[#7F56D9] border-b-2 border-[#7F56D9] bg-white' : 'text-[#717680] hover:text-[#414651]'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="px-4 py-4">
                  {sourceTab === 'quote' && (
                    <blockquote className="border-l-4 border-[#7F56D9] pl-4">
                      <p className="text-sm text-[#535862] italic leading-relaxed">"{excerptText}"</p>
                    </blockquote>
                  )}
                  {sourceTab === 'transcript' && (
                    <p className="text-sm text-[#535862] leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto">
                      {task?.description ?? 'No transcript available.'}
                    </p>
                  )}
                  {sourceTab === 'video' && (
                    <p className="text-sm text-[#A4A7AE] text-center py-4">No video available for this transcript.</p>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-[#414651] mb-1.5">Priority <span className="text-red-500">*</span></label>
            <div className="relative">
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Task['priority'])}
                className="w-full appearance-none border border-[#D5D7DA] rounded-lg px-3 py-2.5 text-sm text-[#181D27] outline-none focus:ring-2 focus:ring-[#7F56D9] focus:border-transparent bg-white"
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
              <ChevronDown width={16} height={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A4A7AE] pointer-events-none" />
            </div>
          </div>

          {/* Task name */}
          <div>
            <label className="block text-sm font-medium text-[#414651] mb-1.5">Task name <span className="text-red-500">*</span></label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-[#D5D7DA] rounded-lg px-3 py-2.5 text-sm text-[#181D27] outline-none focus:ring-2 focus:ring-[#7F56D9] focus:border-transparent"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-[#414651] mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="A little about the task..."
              className="w-full border border-[#D5D7DA] rounded-lg px-3 py-2.5 text-sm text-[#181D27] placeholder-[#A4A7AE] outline-none focus:ring-2 focus:ring-[#7F56D9] focus:border-transparent resize-none"
            />
          </div>

          {/* Due date + Assignee */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#414651] mb-1.5">Due date</label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full border border-[#D5D7DA] rounded-lg px-3 py-2.5 text-sm text-[#181D27] outline-none focus:ring-2 focus:ring-[#7F56D9] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#414651] mb-1.5">Assignee</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setAssigneePickerOpen((v) => !v)}
                  className="w-full flex items-center gap-2 border border-[#D5D7DA] rounded-lg px-3 py-2.5 text-sm text-left hover:bg-[#FAFAFA] transition-colors"
                >
                  {selectedAssignee ? (
                    <>
                      <Avatar name={selectedAssignee.name} size="xs" />
                      <span className="flex-1 truncate text-[#181D27]">{selectedAssignee.name}</span>
                    </>
                  ) : (
                    <>
                      <Users01 width={16} height={16} className="text-[#A4A7AE]" />
                      <span className="flex-1 text-[#A4A7AE]">Select assignee</span>
                    </>
                  )}
                  <ChevronDown width={14} height={14} className="text-[#A4A7AE] shrink-0" />
                </button>
                {assigneePickerOpen && (
                  <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-[#E9EAEB] rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                    <button
                      type="button"
                      onClick={() => { setAssigneeId(''); setAssigneePickerOpen(false); }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[#717680] hover:bg-[#FAFAFA] transition-colors"
                    >
                      Unassigned
                    </button>
                    {users.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => { setAssigneeId(u.id); setAssigneePickerOpen(false); }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[#181D27] hover:bg-[#FAFAFA] transition-colors"
                      >
                        <Avatar name={u.name} size="xs" src={u.avatar_url ?? undefined} />
                        <span className="flex-1 truncate">{u.name}</span>
                        {u.id === assigneeId && <span className="w-1.5 h-1.5 rounded-full bg-[#7F56D9]" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Attach a file */}
          <div>
            <label className="block text-sm font-medium text-[#414651] mb-1.5">Attach a file</label>
            <div className="flex flex-col items-center gap-2 py-6 border-2 border-dashed border-[#D5D7DA] rounded-xl bg-[#FAFAFA] cursor-pointer hover:border-[#7F56D9] transition-colors">
              <UploadCloud01 width={28} height={28} className="text-[#A4A7AE]" />
              <p className="text-sm text-[#535862]">
                <span className="text-[#7F56D9] font-medium">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-[#A4A7AE]">SVG, PNG, JPG or GIF (max. 800×400px)</p>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertCircle width={15} height={15} className="shrink-0 mt-0.5" />
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 px-6 py-4 border-t border-[#E9EAEB] shrink-0">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-3.5 py-2.5 text-sm font-semibold text-[#414651] border border-[#D5D7DA] rounded-lg bg-white hover:bg-gray-50 disabled:opacity-60 transition-colors"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            onClick={handleIgnore}
            disabled={ignoring || !!task?.archived}
            className="px-3.5 py-2.5 text-sm font-semibold text-white bg-[#DC2626] hover:bg-[#B91C1C] disabled:opacity-60 rounded-lg transition-colors"
          >
            {ignoring ? 'Ignoring…' : 'Ignore'}
          </button>
          <button
            onClick={handleArchive}
            disabled={archiving}
            title={task?.archived ? 'Unarchive task' : 'Archive task'}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 text-sm font-semibold rounded-lg transition-colors disabled:opacity-60 ${
              task?.archived
                ? 'text-[#7F56D9] border border-[#7F56D9] bg-white hover:bg-[#F4EBFF]'
                : 'text-[#414651] border border-[#D5D7DA] bg-white hover:bg-gray-50'
            }`}
          >
            <Archive width={14} height={14} />
            {archiving ? '…' : task?.archived ? 'Unarchive' : 'Archive'}
          </button>
          <button
            onClick={() => {
              if (!assigneeId) { setError('Please select an assignee before approving.'); return; }
              setError('');
              setShowConfirm(true);
            }}
            disabled={!!task?.archived}
            className="ml-auto px-3.5 py-2.5 text-sm font-semibold text-white bg-[#7F56D9] hover:bg-[#6941C6] disabled:opacity-60 rounded-lg transition-colors"
          >
            Approve
          </button>
        </div>
      </div>

      <ApprovalConfirmModal
        open={showConfirm}
        task={task}
        assigneeName={selectedAssignee?.name ?? ''}
        assigneeId={assigneeId}
        deadline={deadline}
        onCancel={() => setShowConfirm(false)}
        onConfirm={handleConfirmApprove}
      />
    </>
  );
}

// ── Task Card ─────────────────────────────────────────────────────────────────

interface TaskCardProps {
  task: Task;
  users: User[];
  onClick: () => void;
}

function TaskCard({ task, users, onClick }: TaskCardProps) {
  const [sourceOpen, setSourceOpen] = useState(false);
  const assignee = users.find((u) => u.id === task.assignee_id);
  const isDiscarded = task.status === 'discarded';
  const isArchived = task.archived;

  return (
    <div
      className={`mb-3 rounded-xl border overflow-hidden cursor-pointer transition-shadow hover:shadow-md ${
        isArchived
          ? 'border-[#D5D7DA] bg-[#F9FAFB] opacity-75'
          : isDiscarded
          ? 'border-red-300 bg-[#FFF8F8]'
          : 'border-[#E9EAEB] bg-white'
      }`}
      onClick={onClick}
    >
      {/* Card body */}
      <div className="px-5 pt-4 pb-4">
        {isArchived && (
          <div className="flex items-center gap-1.5 mb-2.5 text-xs font-medium text-[#717680]">
            <Archive width={12} height={12} />
            <span>Archived</span>
          </div>
        )}
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <span className={`text-sm font-semibold ${isArchived ? 'text-[#717680]' : 'text-[#181D27]'}`}>{task.title}</span>
          <TypeBadge type={task.type} />
          <PriorityBadge priority={task.priority} />
          <TaskStatusBadge status={task.status} />
        </div>
        {task.description && (
          <p className="text-sm text-[#535862] line-clamp-2 mb-4">{task.description}</p>
        )}
        <div className="flex items-start gap-10 text-xs">
          <div className="min-w-0">
            <p className="text-[#A4A7AE] mb-1.5">Assignee</p>
            {assignee ? (
              <div className="flex items-center gap-1.5">
                <Avatar name={assignee.name} size="xs" src={assignee.avatar_url ?? undefined} />
                <span className="text-[#181D27] font-medium">{assignee.name}</span>
              </div>
            ) : (
              <span className="text-[#A4A7AE]">Unassigned</span>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-[#A4A7AE] mb-1.5">Due date</p>
            <span className="text-[#181D27]">{task.deadline ? formatDate(task.deadline) : '—'}</span>
          </div>
          <div className="min-w-0">
            <p className="text-[#A4A7AE] mb-1.5">Project list</p>
            <span className="text-[#181D27]">{task.firms?.name ?? task.type ?? '—'}</span>
          </div>
        </div>
      </div>

      {/* Source Quote footer */}
      <div className="border-t border-[#E9EAEB] bg-[#F2F4F7]" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setSourceOpen((v) => !v); }}
          className="flex items-center gap-2 w-full px-5 py-3 text-sm text-[#535862] hover:text-[#181D27] transition-colors"
        >
          <ChevronRight width={15} height={15} className={`text-[#717680] transition-transform shrink-0 ${sourceOpen ? 'rotate-90' : ''}`} />
          <span className="font-medium">Source Quote</span>
        </button>
        {sourceOpen && (
          <div className="px-5 pb-4">
            <blockquote className="border-l-4 border-[#D9D6FE] pl-3 text-xs text-[#535862] italic leading-relaxed">
              "{task.description?.slice(0, 300) ?? 'No source excerpt available.'}"
            </blockquote>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Page state ────────────────────────────────────────────────────────────────

interface PageState {
  sessionId: string;
  firmId: string;
  tasks: Task[];
  transcript: Transcript;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TranscriptTasksPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state ?? {}) as Partial<PageState>;

  const [tasks, setTasks] = useState<Task[]>(state.tasks ?? []);
  const [loading, setLoading] = useState(!state.tasks);
  const [users, setUsers] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState<TaskTab>('all');
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  const transcript = state.transcript;
  const firmName = tasks[0]?.firms?.name ?? '';

  useEffect(() => {
    const sessionId = state.sessionId ?? new URLSearchParams(location.search).get('session_id');
    if (!state.tasks && sessionId) {
      setLoading(true);
      tasksApi.list({ session_id: sessionId })
        .then(setTasks)
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, []);

  useEffect(() => {
    usersApi.list().then(setUsers).catch(() => {});
  }, []);

  const tabCounts = useMemo(() => {
    const counts: Record<TaskTab, number> = { all: 0, pending: 0, approved: 0, 'needs-review': 0, ignored: 0, archived: 0 };
    tasks.forEach((t) => {
      const tab = getTaskTab(t);
      counts[tab]++;
      if (tab !== 'archived') counts.all++;
    });
    return counts;
  }, [tasks]);

  const filtered = useMemo(
    () => activeTab === 'all'
      ? tasks.filter((t) => !t.archived)
      : tasks.filter((t) => getTaskTab(t) === activeTab),
    [tasks, activeTab],
  );

  function handleTaskClick(task: Task) { setActiveTask(task); setPanelOpen(true); }
  function closePanel() { setPanelOpen(false); setActiveTask(null); }
  function handleSaved(updated: Task) { setTasks((prev) => prev.map((t) => t.id === updated.id ? updated : t)); closePanel(); }
  function handleIgnored(taskId: string) { setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: 'discarded' } : t)); closePanel(); }
  function handleApproved(updated: Task) { setTasks((prev) => prev.map((t) => t.id === updated.id ? updated : t)); closePanel(); }
  function handleArchived(updated: Task) { setTasks((prev) => prev.map((t) => t.id === updated.id ? updated : t)); closePanel(); }

  const TABS: { key: TaskTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'approved', label: 'Approved' },
    { key: 'needs-review', label: 'Needs Review' },
    { key: 'ignored', label: 'Ignored' },
    { key: 'archived', label: 'Archived' },
  ];

  return (
    <main className="flex-1 min-w-0 overflow-y-auto bg-white relative">

      {/* Header */}
      <div className="px-6 pt-8 pb-5 border-b border-[#E9EAEB]">
        <button
          onClick={() => navigate('/transcripts')}
          className="flex items-center gap-1.5 text-xs text-[#7F56D9] hover:text-[#6941C6] mb-3 transition-colors"
        >
          <ArrowLeft width={14} height={14} />
          Transcripts Flow
        </button>
        <h1 className="text-2xl font-semibold text-[#181D27]">{transcript?.title ?? 'Extracted Tasks'}</h1>
        {firmName && <p className="text-sm text-[#535862] mt-0.5">{firmName}</p>}
        {transcript && (
          <div className="flex items-center gap-4 mt-3 text-sm text-[#717680]">
            <span className="flex items-center gap-1.5">
              <Calendar width={14} height={14} />
              Transcript recorded {formatDate(transcript.call_date)}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock width={14} height={14} />
              Duration {formatDurationSec(transcript.duration_sec)}
            </span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-6 px-6 border-b border-[#E9EAEB]">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${activeTab === key ? 'border-[#7F56D9] text-[#7F56D9]' : 'border-transparent text-[#717680] hover:text-[#414651]'}`}
          >
            {label}
            <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${activeTab === key ? 'bg-[#F4EBFF] text-[#6941C6]' : 'bg-[#F2F4F7] text-[#717680]'}`}>
              {tabCounts[key]}
            </span>
          </button>
        ))}
      </div>

      {/* Task list */}
      {loading ? (
        <div className="py-16 text-center text-sm text-[#A4A7AE]">Loading tasks…</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <CheckCircle width={40} height={40} className="text-[#D5D7DA]" />
          <p className="text-sm font-medium text-[#535862]">No tasks in this category</p>
        </div>
      ) : (
        <div className="px-6 py-5">
          {filtered.map((task) => (
            <TaskCard key={task.id} task={task} users={users} onClick={() => handleTaskClick(task)} />
          ))}
        </div>
      )}

      {/* Task detail panel */}
      <TaskDetailPanel
        task={activeTask}
        open={panelOpen}
        onClose={closePanel}
        users={users}
        onSaved={handleSaved}
        onIgnored={handleIgnored}
        onApproved={handleApproved}
        onArchived={handleArchived}
      />
    </main>
  );
}
